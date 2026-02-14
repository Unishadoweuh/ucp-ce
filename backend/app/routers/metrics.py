"""Metrics router — Proxmox RRD data for monitoring graphs."""

from fastapi import APIRouter, HTTPException, Depends
from app.services import proxmox
from app.dependencies import get_current_user_vm, get_current_user_lxc

router = APIRouter(prefix="/metrics", tags=["Metrics"])


@router.get("/vm/{node}/{vmid}")
async def get_vm_metrics(
    node: str,
    vmid: int,
    timeframe: str = "hour",
    vm: dict = Depends(get_current_user_vm),
):
    """Get RRD metrics for a VM. timeframe: hour | day | week | month | year"""
    valid = {"hour", "day", "week", "month", "year"}
    if timeframe not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid timeframe. Must be one of {valid}")
    try:
        pve = proxmox._get_proxmox()
        rrd = pve.nodes(node).qemu(vmid).rrddata.get(timeframe=timeframe)
        return _format_rrd(rrd)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Proxmox error: {exc}")


@router.get("/lxc/{node}/{vmid}")
async def get_lxc_metrics(
    node: str,
    vmid: int,
    timeframe: str = "hour",
    ct: dict = Depends(get_current_user_lxc),
):
    """Get RRD metrics for a LXC container."""
    valid = {"hour", "day", "week", "month", "year"}
    if timeframe not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid timeframe. Must be one of {valid}")
    try:
        pve = proxmox._get_proxmox()
        rrd = pve.nodes(node).lxc(vmid).rrddata.get(timeframe=timeframe)
        return _format_rrd(rrd)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Proxmox error: {exc}")


def _format_rrd(rrd_data: list) -> dict:
    """Transform Proxmox RRD data into frontend-friendly format."""
    cpu = []
    memory = []
    disk_read = []
    disk_write = []
    net_in = []
    net_out = []

    for d in rrd_data:
        t = d.get("time", 0)
        cpu.append({"time": t, "value": round((d.get("cpu", 0) or 0) * 100, 2)})
        mem_bytes = d.get("mem", 0) or d.get("maxmem", 0) or 0
        memory.append({"time": t, "value": round(mem_bytes / (1024**3), 2)})
        disk_read.append({"time": t, "value": round((d.get("diskread", 0) or 0) / (1024**2), 2)})
        disk_write.append({"time": t, "value": round((d.get("diskwrite", 0) or 0) / (1024**2), 2)})
        net_in.append({"time": t, "value": round((d.get("netin", 0) or 0) / (1024**2), 2)})
        net_out.append({"time": t, "value": round((d.get("netout", 0) or 0) / (1024**2), 2)})

    return {
        "cpu": cpu,
        "memory": memory,
        "disk_read": disk_read,
        "disk_write": disk_write,
        "net_in": net_in,
        "net_out": net_out,
    }
