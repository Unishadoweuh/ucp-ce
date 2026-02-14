"""Billing — Cost tracking based on vCPU-hours, RAM-hours, and disk usage."""

from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.auth import get_current_user
from app.services import proxmox
from app.models.user import User

router = APIRouter(prefix="/billing", tags=["Billing"])

# Cost rates (per hour)
RATES = {
    "vcpu_hour": 0.012,       # $0.012 per vCPU-hour
    "ram_gb_hour": 0.004,     # $0.004 per GB-hour
    "disk_gb_month": 0.04,    # $0.04 per GB-month
}


def _estimate_monthly_cost(vcpus: int, memory_mb: int, disk_gb: int) -> dict:
    """Estimate monthly cost for a resource based on 730h/month."""
    hours_per_month = 730
    cpu_cost = vcpus * RATES["vcpu_hour"] * hours_per_month
    ram_cost = (memory_mb / 1024) * RATES["ram_gb_hour"] * hours_per_month
    disk_cost = disk_gb * RATES["disk_gb_month"]
    total = cpu_cost + ram_cost + disk_cost
    return {
        "cpu": round(cpu_cost, 2),
        "ram": round(ram_cost, 2),
        "disk": round(disk_cost, 2),
        "total": round(total, 2),
    }


@router.get("/summary")
async def billing_summary(user: User = Depends(get_current_user)):
    """Get billing summary for the current user's resources."""
    # Fetch user's VMs and LXC
    vms = proxmox.list_vms()
    lxcs = proxmox.list_lxc()

    user_vms = [v for v in vms if f"ucp-owner:{user.id}" in (v.get("tags", "") or "")]
    user_lxcs = [c for c in lxcs if f"ucp-owner:{user.id}" in (c.get("tags", "") or "")]

    resources = []
    total_cost = 0.0

    for vm in user_vms:
        cost = _estimate_monthly_cost(
            vm.get("cpus", 0) or vm.get("maxcpu", 0),
            (vm.get("maxmem", 0) or 0) / (1024 * 1024),
            (vm.get("maxdisk", 0) or 0) / (1024 * 1024 * 1024),
        )
        resources.append({
            "name": vm.get("name", f"vm-{vm['vmid']}"),
            "vmid": vm["vmid"],
            "type": "VM",
            "node": vm.get("node", ""),
            "status": vm.get("status", "unknown"),
            "vcpus": vm.get("cpus", 0) or vm.get("maxcpu", 0),
            "memory_gb": round((vm.get("maxmem", 0) or 0) / (1024 * 1024 * 1024), 1),
            "disk_gb": round((vm.get("maxdisk", 0) or 0) / (1024 * 1024 * 1024), 0),
            "uptime_hours": round((vm.get("uptime", 0) or 0) / 3600, 1),
            "estimated_monthly": cost,
        })
        total_cost += cost["total"]

    for ct in user_lxcs:
        cost = _estimate_monthly_cost(
            ct.get("cpus", 0) or ct.get("maxcpu", 0),
            (ct.get("maxmem", 0) or 0) / (1024 * 1024),
            (ct.get("maxdisk", 0) or 0) / (1024 * 1024 * 1024),
        )
        resources.append({
            "name": ct.get("name", f"ct-{ct['vmid']}"),
            "vmid": ct["vmid"],
            "type": "LXC",
            "node": ct.get("node", ""),
            "status": ct.get("status", "unknown"),
            "vcpus": ct.get("cpus", 0) or ct.get("maxcpu", 0),
            "memory_gb": round((ct.get("maxmem", 0) or 0) / (1024 * 1024 * 1024), 1),
            "disk_gb": round((ct.get("maxdisk", 0) or 0) / (1024 * 1024 * 1024), 0),
            "uptime_hours": round((ct.get("uptime", 0) or 0) / 3600, 1),
            "estimated_monthly": cost,
        })
        total_cost += cost["total"]

    return {
        "currency": "USD",
        "rates": RATES,
        "resources": resources,
        "total_estimated_monthly": round(total_cost, 2),
        "generated_at": datetime.utcnow().isoformat(),
    }


@router.get("/rates")
async def get_rates():
    """Get current pricing rates."""
    return RATES
