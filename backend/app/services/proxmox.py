"""Proxmox VE service — wraps proxmoxer into high-level helpers."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from proxmoxer import ProxmoxAPI

from app.config import get_settings

logger = logging.getLogger(__name__)

_proxmox: Optional[ProxmoxAPI] = None


def _get_proxmox() -> ProxmoxAPI:
    """Lazy singleton for the Proxmox connection."""
    global _proxmox
    if _proxmox is None:
        settings = get_settings()
        _proxmox = ProxmoxAPI(
            settings.proxmox_host,
            user=settings.proxmox_token_name.split("!")[0],
            token_name=settings.proxmox_token_name.split("!")[-1],
            token_value=settings.proxmox_token_value,
            verify_ssl=settings.proxmox_verify_ssl,
        )
        logger.info("Connected to Proxmox at %s", settings.proxmox_host)
    return _proxmox


# ── Nodes ────────────────────────────────────────────────────
def list_nodes() -> List[Dict[str, Any]]:
    """Return all cluster nodes."""
    return _get_proxmox().nodes.get()


# ── VMs (QEMU) ──────────────────────────────────────────────
def list_vms(node: Optional[str] = None) -> List[Dict[str, Any]]:
    """List QEMU VMs across all nodes (or a specific one)."""
    pve = _get_proxmox()
    vms: List[Dict[str, Any]] = []
    nodes = [{"node": node}] if node else pve.nodes.get()
    for n in nodes:
        node_name = n["node"]
        try:
            for vm in pve.nodes(node_name).qemu.get():
                vm["node"] = node_name
                vms.append(vm)
        except Exception as exc:
            logger.warning("Failed to list VMs on %s: %s", node_name, exc)
    return vms


def get_vm(node: str, vmid: int) -> Dict[str, Any]:
    """Get detailed config for a single VM."""
    pve = _get_proxmox()
    status = pve.nodes(node).qemu(vmid).status.current.get()
    config = pve.nodes(node).qemu(vmid).config.get()
    return {**status, **config, "node": node, "vmid": vmid}


def create_vm(
    node: str,
    template_vmid: int,
    name: str,
    vcpus: int,
    memory_mb: int,
    storage: str = "local-lvm",
    disk_size_gb: int = 32,
    start: bool = True,
    description: str = "",
    tags: str = "",
) -> Dict[str, Any]:
    """Clone a template and reconfigure CPU/RAM."""
    pve = _get_proxmox()

    # Get next available VMID
    new_vmid = pve.cluster.nextid.get()

    # Clone the template
    pve.nodes(node).qemu(template_vmid).clone.post(
        newid=new_vmid,
        name=name,
        full=1,
        target=node,
        storage=storage,
        description=description,
    )

    logger.info("Cloned template %s → VM %s on %s", template_vmid, new_vmid, node)

    # Reconfigure CPU / RAM
    pve.nodes(node).qemu(new_vmid).config.put(
        cores=vcpus,
        memory=memory_mb,
        tags=tags,
    )

    # Resize disk if needed
    if disk_size_gb > 0:
        try:
            pve.nodes(node).qemu(new_vmid).resize.put(
                disk="scsi0",
                size=f"{disk_size_gb}G",
            )
        except Exception as exc:
            logger.warning("Disk resize skipped: %s", exc)

    # Start the VM if requested
    if start:
        pve.nodes(node).qemu(new_vmid).status.start.post()

    return {"vmid": new_vmid, "node": node, "name": name, "status": "starting" if start else "stopped"}


def vm_action(node: str, vmid: int, action: str) -> Dict[str, Any]:
    """Perform an action (start, stop, shutdown, reset, suspend, resume) on a VM."""
    pve = _get_proxmox()
    valid_actions = {"start", "stop", "shutdown", "reset", "suspend", "resume"}
    if action not in valid_actions:
        raise ValueError(f"Invalid action: {action}. Must be one of {valid_actions}")

    endpoint = getattr(pve.nodes(node).qemu(vmid).status, action)
    endpoint.post()
    return {"vmid": vmid, "action": action, "status": "ok"}


def delete_vm(node: str, vmid: int) -> Dict[str, Any]:
    """Delete a VM (must be stopped first)."""
    pve = _get_proxmox()
    pve.nodes(node).qemu(vmid).delete()
    return {"vmid": vmid, "status": "deleted"}


# ── Templates / Images ──────────────────────────────────────
def list_templates(node: Optional[str] = None) -> List[Dict[str, Any]]:
    """List VMs marked as templates (usable as boot images)."""
    all_vms = list_vms(node)
    return [vm for vm in all_vms if vm.get("template", 0) == 1]


# ── Storage ──────────────────────────────────────────────────
def list_storage(node: Optional[str] = None) -> List[Dict[str, Any]]:
    """List storage pools."""
    pve = _get_proxmox()
    if node:
        return pve.nodes(node).storage.get()
    storages: List[Dict[str, Any]] = []
    for n in pve.nodes.get():
        for s in pve.nodes(n["node"]).storage.get():
            s["node"] = n["node"]
            storages.append(s)
    return storages


# ── Cluster stats ────────────────────────────────────────────
def cluster_stats() -> Dict[str, Any]:
    """Aggregate cluster-level metrics (VMs + LXC)."""
    nodes = list_nodes()
    all_vms = list_vms()
    all_lxc = list_lxc()

    # VMs
    non_template_vms = [v for v in all_vms if v.get("template", 0) != 1]
    running_vms = [v for v in non_template_vms if v.get("status") == "running"]
    stopped_vms = [v for v in non_template_vms if v.get("status") == "stopped"]

    # LXC
    running_lxc = [c for c in all_lxc if c.get("status") == "running"]
    stopped_lxc = [c for c in all_lxc if c.get("status") == "stopped"]

    # Aggregate running instances
    all_running = running_vms + running_lxc
    total_vcpus = sum(v.get("cpus", 0) or v.get("maxcpu", 0) for v in all_running)
    total_mem = sum(v.get("mem", 0) for v in all_running)
    max_mem = sum(n.get("maxmem", 0) for n in nodes)
    total_disk = sum(n.get("disk", 0) for n in nodes)
    max_disk = sum(n.get("maxdisk", 0) for n in nodes)

    node_summaries = []
    for n in nodes:
        nn = n["node"]
        node_vms = [v for v in non_template_vms if v.get("node") == nn]
        node_lxc = [c for c in all_lxc if c.get("node") == nn]
        node_summaries.append({
            "node": nn,
            "status": n.get("status", "unknown"),
            "cpu_usage": round(n.get("cpu", 0) * 100, 1),
            "memory_used_mb": round(n.get("mem", 0) / 1024 / 1024),
            "memory_max_mb": round(n.get("maxmem", 0) / 1024 / 1024),
            "vm_count": len(node_vms),
            "lxc_count": len(node_lxc),
        })

    return {
        "cluster": {
            "total_vms": len(non_template_vms),
            "total_lxc": len(all_lxc),
            "total_instances": len(non_template_vms) + len(all_lxc),
            "running_vms": len(running_vms),
            "running_lxc": len(running_lxc),
            "running_total": len(all_running),
            "stopped_vms": len(stopped_vms),
            "stopped_lxc": len(stopped_lxc),
            "total_vcpus_used": total_vcpus,
            "total_memory_used_mb": round(total_mem / 1024 / 1024),
            "total_memory_max_mb": round(max_mem / 1024 / 1024),
            "total_disk_used_gb": round(total_disk / 1024 / 1024 / 1024, 1),
            "total_disk_max_gb": round(max_disk / 1024 / 1024 / 1024, 1),
            "nodes_online": len([n for n in nodes if n.get("status") == "online"]),
            "nodes_total": len(nodes),
        },
        "nodes": node_summaries,
    }


# ── Snapshots ────────────────────────────────────────────────
def list_snapshots(node: str, vmid: int) -> List[Dict[str, Any]]:
    """List snapshots for a VM."""
    pve = _get_proxmox()
    return pve.nodes(node).qemu(vmid).snapshot.get()


def create_snapshot(node: str, vmid: int, name: str, description: str = "") -> Dict[str, Any]:
    """Create a snapshot."""
    pve = _get_proxmox()
    pve.nodes(node).qemu(vmid).snapshot.post(
        snapname=name,
        description=description,
    )
    return {"vmid": vmid, "snapshot": name, "status": "created"}


def delete_snapshot(node: str, vmid: int, snapname: str) -> Dict[str, Any]:
    """Delete a snapshot."""
    pve = _get_proxmox()
    pve.nodes(node).qemu(vmid).snapshot(snapname).delete()
    return {"vmid": vmid, "snapshot": snapname, "status": "deleted"}


# ── Backups ──────────────────────────────────────────────────
def list_backups(node: str, vmid: int) -> List[Dict[str, Any]]:
    """List available backup volumes for a VM on its storage."""
    pve = _get_proxmox()
    backups = []
    # Search all storages on the node for backup volumes
    for storage in pve.nodes(node).storage.get():
        storage_id = storage["storage"]
        try:
            contents = pve.nodes(node).storage(storage_id).content.get(content="backup")
            for item in contents:
                # Filter by VMID
                if item.get("vmid") == vmid:
                    backups.append({
                        **item,
                        "storage": storage_id,
                        "node": node,
                    })
        except Exception:
            continue
    # Sort by creation time (newest first)
    backups.sort(key=lambda b: b.get("ctime", 0), reverse=True)
    return backups


def restore_backup(
    node: str,
    vmid: int,
    volid: str,
    storage: Optional[str] = None,
) -> Dict[str, Any]:
    """Restore a VM from a backup volume."""
    pve = _get_proxmox()
    params: Dict[str, Any] = {"archive": volid, "force": 1}
    if storage:
        params["storage"] = storage
    task = pve.nodes(node).qemu(vmid).status.post(**params)
    logger.info("Restore started for VM %s from %s: task=%s", vmid, volid, task)
    return {"vmid": vmid, "volid": volid, "task": str(task), "status": "restoring"}


# ── LXC Containers ───────────────────────────────────────────
def list_lxc(node: Optional[str] = None) -> List[Dict[str, Any]]:
    """List LXC containers across all nodes (or a specific one)."""
    pve = _get_proxmox()
    cts: List[Dict[str, Any]] = []
    nodes = [{"node": node}] if node else pve.nodes.get()
    for n in nodes:
        node_name = n["node"]
        try:
            for ct in pve.nodes(node_name).lxc.get():
                ct["node"] = node_name
                ct["type"] = "lxc"
                cts.append(ct)
        except Exception as exc:
            logger.warning("Failed to list LXC on %s: %s", node_name, exc)
    return cts


def get_lxc(node: str, vmid: int) -> Dict[str, Any]:
    """Get detailed config for a single LXC container."""
    pve = _get_proxmox()
    status = pve.nodes(node).lxc(vmid).status.current.get()
    config = pve.nodes(node).lxc(vmid).config.get()
    return {**status, **config, "node": node, "vmid": vmid, "type": "lxc"}


def create_lxc(
    node: str,
    ostemplate: str,
    name: str,
    memory_mb: int = 512,
    swap_mb: int = 512,
    cores: int = 1,
    disk_gb: int = 8,
    storage: str = "local-lvm",
    net_bridge: str = "vmbr0",
    net_ip: str = "dhcp",
    unprivileged: bool = True,
    start: bool = True,
    description: str = "",
    tags: str = "",
    password: str = "",
) -> Dict[str, Any]:
    """Create a new LXC container from a template."""
    pve = _get_proxmox()

    new_vmid = pve.cluster.nextid.get()

    params: Dict[str, Any] = {
        "vmid": new_vmid,
        "hostname": name,
        "ostemplate": ostemplate,
        "memory": memory_mb,
        "swap": swap_mb,
        "cores": cores,
        "rootfs": f"{storage}:{disk_gb}",
        "net0": f"name=eth0,bridge={net_bridge},ip={net_ip},type=veth",
        "unprivileged": 1 if unprivileged else 0,
        "start": 1 if start else 0,
        "description": description,
        "tags": tags,
    }
    if password:
        params["password"] = password

    task = pve.nodes(node).lxc.post(**params)
    logger.info("Created LXC %s (%s) on %s: task=%s", new_vmid, name, node, task)

    return {"vmid": new_vmid, "node": node, "name": name, "status": "creating"}


def lxc_action(node: str, vmid: int, action: str) -> Dict[str, Any]:
    """Perform an action (start, stop, shutdown, reboot) on a LXC container."""
    pve = _get_proxmox()
    valid_actions = {"start", "stop", "shutdown", "reboot"}
    if action not in valid_actions:
        raise ValueError(f"Invalid action: {action}. Must be one of {valid_actions}")

    endpoint = getattr(pve.nodes(node).lxc(vmid).status, action)
    endpoint.post()
    return {"vmid": vmid, "action": action, "status": "ok"}


def delete_lxc(node: str, vmid: int) -> Dict[str, Any]:
    """Delete a LXC container (must be stopped first)."""
    pve = _get_proxmox()
    pve.nodes(node).lxc(vmid).delete()
    return {"vmid": vmid, "status": "deleted"}


def resize_lxc(
    node: str,
    vmid: int,
    cores: Optional[int] = None,
    memory_mb: Optional[int] = None,
) -> Dict[str, Any]:
    """Hotplug resize a LXC container (CPU/RAM)."""
    pve = _get_proxmox()
    params: Dict[str, Any] = {}
    if cores is not None:
        params["cores"] = cores
    if memory_mb is not None:
        params["memory"] = memory_mb

    if params:
        pve.nodes(node).lxc(vmid).config.put(**params)

    return {"vmid": vmid, "resized": params, "status": "ok"}


def list_lxc_templates(node: Optional[str] = None) -> List[Dict[str, Any]]:
    """List available LXC templates (vztmpl) from storages."""
    pve = _get_proxmox()
    templates: List[Dict[str, Any]] = []
    nodes_list = [{"node": node}] if node else pve.nodes.get()
    for n in nodes_list:
        node_name = n["node"]
        try:
            for st in pve.nodes(node_name).storage.get():
                if "vztmpl" in st.get("content", ""):
                    storage_id = st["storage"]
                    for tmpl in pve.nodes(node_name).storage(storage_id).content.get(content="vztmpl"):
                        tmpl["node"] = node_name
                        tmpl["storage"] = storage_id
                        templates.append(tmpl)
        except Exception as exc:
            logger.warning("Failed to list LXC templates on %s: %s", node_name, exc)
    return templates


# ── LXC Snapshots ────────────────────────────────────────────
def list_lxc_snapshots(node: str, vmid: int) -> List[Dict[str, Any]]:
    """List snapshots for a LXC container."""
    pve = _get_proxmox()
    return pve.nodes(node).lxc(vmid).snapshot.get()


def create_lxc_snapshot(node: str, vmid: int, name: str, description: str = "") -> Dict[str, Any]:
    """Create a snapshot for a LXC container."""
    pve = _get_proxmox()
    pve.nodes(node).lxc(vmid).snapshot.post(snapname=name, description=description)
    return {"vmid": vmid, "snapshot": name, "status": "created"}


def delete_lxc_snapshot(node: str, vmid: int, snapname: str) -> Dict[str, Any]:
    """Delete a snapshot for a LXC container."""
    pve = _get_proxmox()
    pve.nodes(node).lxc(vmid).snapshot(snapname).delete()
    return {"vmid": vmid, "snapshot": snapname, "status": "deleted"}

