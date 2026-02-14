"""Logs router — VM/LXC syslog and task logs from Proxmox."""

from fastapi import APIRouter, HTTPException, Depends, Query
from app.services import proxmox
from app.dependencies import get_current_user_vm, get_current_user_lxc

router = APIRouter(prefix="/logs", tags=["Logs"])


@router.get("/vm/{node}/{vmid}")
async def get_vm_logs(
    node: str,
    vmid: int,
    limit: int = Query(default=100, ge=1, le=500),
    start: int = Query(default=0, ge=0),
    vm: dict = Depends(get_current_user_vm),
):
    """Get syslog entries for a VM from Proxmox."""
    try:
        pve = proxmox._get_proxmox()
        # Get VM syslog from Proxmox
        log_entries = pve.nodes(node).qemu(vmid).config.get()
        # Get task log for recent operations
        tasks = pve.nodes(node).tasks.get(vmid=vmid, limit=limit, start=start)
        
        formatted_tasks = []
        for task in tasks:
            formatted_tasks.append({
                "upid": task.get("upid", ""),
                "type": task.get("type", ""),
                "status": task.get("status", ""),
                "starttime": task.get("starttime", 0),
                "endtime": task.get("endtime", 0),
                "user": task.get("user", ""),
                "node": task.get("node", node),
            })
        
        return {
            "vmid": vmid,
            "node": node,
            "type": "vm",
            "tasks": formatted_tasks,
            "config": {
                "name": log_entries.get("name", ""),
                "boot": log_entries.get("boot", ""),
                "ostype": log_entries.get("ostype", ""),
            },
        }
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Proxmox error: {exc}")


@router.get("/lxc/{node}/{vmid}")
async def get_lxc_logs(
    node: str,
    vmid: int,
    limit: int = Query(default=100, ge=1, le=500),
    start: int = Query(default=0, ge=0),
    ct: dict = Depends(get_current_user_lxc),
):
    """Get task logs for a LXC container from Proxmox."""
    try:
        pve = proxmox._get_proxmox()
        tasks = pve.nodes(node).tasks.get(vmid=vmid, limit=limit, start=start)
        
        formatted_tasks = []
        for task in tasks:
            formatted_tasks.append({
                "upid": task.get("upid", ""),
                "type": task.get("type", ""),
                "status": task.get("status", ""),
                "starttime": task.get("starttime", 0),
                "endtime": task.get("endtime", 0),
                "user": task.get("user", ""),
                "node": task.get("node", node),
            })
        
        return {
            "vmid": vmid,
            "node": node,
            "type": "lxc",
            "tasks": formatted_tasks,
        }
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Proxmox error: {exc}")


@router.get("/task/{node}/{upid}")
async def get_task_log(
    node: str,
    upid: str,
):
    """Get detailed log output for a specific Proxmox task."""
    try:
        pve = proxmox._get_proxmox()
        log_lines = pve.nodes(node).tasks(upid).log.get(limit=500)
        return {
            "upid": upid,
            "lines": [line.get("t", "") for line in log_lines],
        }
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Proxmox error: {exc}")
