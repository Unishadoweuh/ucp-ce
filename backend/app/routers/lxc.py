"""LXC containers router — list, create, action, delete, resize, snapshots."""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.schemas.lxc import (
    CreateLxcRequest,
    LxcAction,
    LxcRead,
    ResizeLxcRequest,
)
from app.models.user import User
from app.database import get_db
from app.services import proxmox
from app.services.auth import get_current_user

router = APIRouter(prefix="/lxc", tags=["LXC Containers"])

OWNER_TAG_PREFIX = "ucp-owner:"


def _ct_to_read(ct: dict) -> LxcRead:
    """Map Proxmox LXC dict to LxcRead schema."""
    maxdisk = ct.get("maxdisk", 0)
    disk_gb = round(maxdisk / (1024**3), 1) if maxdisk else 0
    return LxcRead(
        vmid=ct.get("vmid", 0),
        name=ct.get("name", "") or ct.get("hostname", f"ct-{ct.get('vmid', '?')}"),
        node=ct.get("node", ""),
        status=ct.get("status", "unknown"),
        vcpus=ct.get("cpus", 0) or ct.get("maxcpu", 0) or ct.get("cores", 0) or 0,
        memory_mb=round((ct.get("maxmem", 0) or ct.get("memory", 0)) / (1024**2)) if ct.get("maxmem", 0) > 1024 else ct.get("maxmem", 0) or ct.get("memory", 0),
        disk_gb=disk_gb,
        uptime=ct.get("uptime", 0),
        tags=ct.get("tags", ""),
    )


def _is_owner(ct: dict, user_id: int) -> bool:
    tags = ct.get("tags", "") or ""
    return f"{OWNER_TAG_PREFIX}{user_id}" in tags


def _get_user_cts(all_cts: list, user: User) -> list:
    if user.role == "admin":
        return all_cts
    return [c for c in all_cts if _is_owner(c, user.id)]


@router.get("", response_model=List[LxcRead])
async def list_containers(
    node: str | None = None,
    scope: str | None = None,
    user: User = Depends(get_current_user),
):
    """List LXC containers. Users see own, admins see all."""
    try:
        cts = proxmox.list_lxc(node=node)
        if user.role == "admin" and scope != "mine":
            return [_ct_to_read(c) for c in cts]
        else:
            return [_ct_to_read(c) for c in cts if _is_owner(c, user.id)]
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Proxmox error: {exc}")


@router.get("/templates")
async def list_templates(node: str | None = None, user: User = Depends(get_current_user)):
    """List available LXC templates (vztmpl)."""
    try:
        return proxmox.list_lxc_templates(node=node)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Proxmox error: {exc}")


@router.get("/{node}/{vmid}", response_model=LxcRead)
async def get_container(node: str, vmid: int, user: User = Depends(get_current_user)):
    """Get a single LXC container."""
    try:
        ct = proxmox.get_lxc(node, vmid)
        if user.role != "admin" and not _is_owner(ct, user.id):
            raise HTTPException(status_code=403, detail="Not your container")
        return _ct_to_read(ct)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Proxmox error: {exc}")


@router.post("", status_code=201)
async def create_container(
    req: CreateLxcRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new LXC container with quota enforcement."""
    # Quota enforcement
    if user.quota and user.role != "admin":
        try:
            all_vms = proxmox.list_vms()
            all_lxc = proxmox.list_lxc()
            my_instances = [
                v for v in (all_vms + all_lxc)
                if _is_owner(v, user.id) and not v.get("template", 0)
            ]

            used_vcpus = sum(v.get("cpus", 0) or v.get("maxcpu", 0) for v in my_instances)
            used_ram_bytes = sum(v.get("maxmem", 0) for v in my_instances)
            used_disk_bytes = sum(v.get("maxdisk", 0) for v in my_instances)

            if used_vcpus + req.cores > user.quota.max_vcpus:
                raise HTTPException(status_code=403, detail=f"vCPU quota exceeded: {used_vcpus} + {req.cores} > {user.quota.max_vcpus}")
            if (used_ram_bytes / (1024**3)) + (req.memory_mb / 1024) > user.quota.max_ram_gb:
                raise HTTPException(status_code=403, detail="RAM quota exceeded")
            if (used_disk_bytes / (1024**3)) + req.disk_gb > user.quota.max_disk_gb:
                raise HTTPException(status_code=403, detail="Disk quota exceeded")
        except HTTPException:
            raise
        except Exception:
            pass

    # Build ownership tag
    owner_tag = f"{OWNER_TAG_PREFIX}{user.id}"
    all_tags = [owner_tag]
    if req.tags:
        all_tags.extend([t.strip() for t in req.tags.split(",") if t.strip()])
    tags_str = ";".join(all_tags)

    # Build net_ip with gateway if provided
    net_ip = req.net_ip
    if req.net_gateway and net_ip != "dhcp":
        net_ip = f"{net_ip},gw={req.net_gateway}"

    try:
        return proxmox.create_lxc(
            node=req.node,
            ostemplate=req.ostemplate,
            name=req.name,
            memory_mb=req.memory_mb,
            swap_mb=req.swap_mb,
            cores=req.cores,
            disk_gb=req.disk_gb,
            storage=req.storage,
            net_bridge=req.net_bridge,
            net_ip=net_ip,
            unprivileged=req.unprivileged,
            start=req.start_after_create,
            description=req.description or "",
            tags=tags_str,
            password=req.password or "",
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Proxmox error: {exc}")


@router.post("/{node}/{vmid}/action")
async def container_action(
    node: str, vmid: int, body: LxcAction, user: User = Depends(get_current_user),
):
    """Perform an action on a container — must be owner or admin."""
    try:
        ct = proxmox.get_lxc(node, vmid)
        if user.role != "admin" and not _is_owner(ct, user.id):
            raise HTTPException(status_code=403, detail="Not your container")
        return proxmox.lxc_action(node, vmid, body.action)
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Proxmox error: {exc}")


@router.post("/{node}/{vmid}/resize")
async def resize_container(
    node: str, vmid: int, body: ResizeLxcRequest, user: User = Depends(get_current_user),
):
    """Hotplug resize a container's CPU/RAM."""
    try:
        ct = proxmox.get_lxc(node, vmid)
        if user.role != "admin" and not _is_owner(ct, user.id):
            raise HTTPException(status_code=403, detail="Not your container")
        return proxmox.resize_lxc(node, vmid, cores=body.cores, memory_mb=body.memory_mb)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Proxmox error: {exc}")


@router.delete("/{node}/{vmid}")
async def delete_container(node: str, vmid: int, user: User = Depends(get_current_user)):
    """Delete a container — must be owner or admin."""
    try:
        ct = proxmox.get_lxc(node, vmid)
        if user.role != "admin" and not _is_owner(ct, user.id):
            raise HTTPException(status_code=403, detail="Not your container")
        return proxmox.delete_lxc(node, vmid)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Proxmox error: {exc}")


# ── LXC Snapshots ────────────────────────────────────────────
@router.get("/{node}/{vmid}/snapshots")
async def list_ct_snapshots(node: str, vmid: int, user: User = Depends(get_current_user)):
    """List snapshots for a container."""
    try:
        ct = proxmox.get_lxc(node, vmid)
        if user.role != "admin" and not _is_owner(ct, user.id):
            raise HTTPException(status_code=403, detail="Not your container")
        return proxmox.list_lxc_snapshots(node, vmid)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Proxmox error: {exc}")


@router.post("/{node}/{vmid}/snapshots")
async def create_ct_snapshot(
    node: str, vmid: int, name: str, description: str = "",
    user: User = Depends(get_current_user),
):
    """Create a snapshot for a container."""
    try:
        ct = proxmox.get_lxc(node, vmid)
        if user.role != "admin" and not _is_owner(ct, user.id):
            raise HTTPException(status_code=403, detail="Not your container")
        return proxmox.create_lxc_snapshot(node, vmid, name, description)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Proxmox error: {exc}")


@router.delete("/{node}/{vmid}/snapshots/{snapname}")
async def delete_ct_snapshot(
    node: str, vmid: int, snapname: str, user: User = Depends(get_current_user),
):
    """Delete a snapshot for a container."""
    try:
        ct = proxmox.get_lxc(node, vmid)
        if user.role != "admin" and not _is_owner(ct, user.id):
            raise HTTPException(status_code=403, detail="Not your container")
        return proxmox.delete_lxc_snapshot(node, vmid, snapname)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Proxmox error: {exc}")
