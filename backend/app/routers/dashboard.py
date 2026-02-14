"""Dashboard router — cluster overview with user-scoped stats."""

from fastapi import APIRouter, Depends, Query

from app.services import proxmox
from app.services.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

OWNER_TAG_PREFIX = "ucp-owner:"


@router.get("")
async def get_dashboard(
    scope: str = Query(default="all"),  # "mine" | "all"
    user: User = Depends(get_current_user),
):
    """Return cluster overview. Users always see stats for their own VMs.
    Admins default to all, can filter with scope=mine."""
    stats = proxmox.cluster_stats()

    # If user is not admin, force scope to 'mine'
    if user.role != "admin":
        scope = "mine"

    if scope == "mine":
        # Re-filter stats for user's VMs only
        try:
            all_vms = proxmox.list_vms()
            my_vms = [
                v for v in all_vms
                if f"{OWNER_TAG_PREFIX}{user.id}" in (v.get("tags", "") or "")
                and not v.get("template", 0)
            ]
            running = [v for v in my_vms if v.get("status") == "running"]
            stopped = [v for v in my_vms if v.get("status") == "stopped"]
            total_vcpus = sum(v.get("cpus", 0) or v.get("maxcpu", 0) for v in running)
            total_mem = sum(v.get("mem", 0) for v in running)

            stats["cluster"]["total_vms"] = len(my_vms)
            stats["cluster"]["running_vms"] = len(running)
            stats["cluster"]["stopped_vms"] = len(stopped)
            stats["cluster"]["total_vcpus_used"] = total_vcpus
            stats["cluster"]["total_memory_used_mb"] = round(total_mem / 1024 / 1024)
        except Exception:
            pass  # Fallback to cluster-wide stats

    return stats
