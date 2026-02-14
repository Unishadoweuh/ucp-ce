"""Search router — global resource search across VMs, LXC, and users."""

from fastapi import APIRouter, Depends, Request
from app.services import proxmox
from app.services.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/search", tags=["Search"])

OWNER_TAG_PREFIX = "ucp-owner:"


def _is_owner(resource: dict, user_id: int) -> bool:
    tags = resource.get("tags", "") or ""
    return f"{OWNER_TAG_PREFIX}{user_id}" in tags


@router.get("")
async def search_resources(q: str = "", user: User = Depends(get_current_user)):
    """Search VMs and LXC containers by name, node, or VMID."""
    if not q or len(q) < 2:
        return {"results": []}

    query = q.lower().strip()
    results = []

    # Search VMs
    try:
        vms = proxmox.list_vms()
        for vm in vms:
            if vm.get("template", 0):
                continue
            if user.role != "admin" and not _is_owner(vm, user.id):
                continue
            name = (vm.get("name", "") or "").lower()
            node = (vm.get("node", "") or "").lower()
            vmid_str = str(vm.get("vmid", ""))
            if query in name or query in node or query in vmid_str:
                results.append({
                    "type": "vm",
                    "vmid": vm.get("vmid"),
                    "name": vm.get("name", ""),
                    "node": vm.get("node", ""),
                    "status": vm.get("status", "unknown"),
                    "path": f"/compute/instances",
                })
    except Exception:
        pass

    # Search LXC
    try:
        cts = proxmox.list_lxc()
        for ct in cts:
            if user.role != "admin" and not _is_owner(ct, user.id):
                continue
            name = (ct.get("name", "") or "").lower()
            node = (ct.get("node", "") or "").lower()
            vmid_str = str(ct.get("vmid", ""))
            if query in name or query in node or query in vmid_str:
                results.append({
                    "type": "lxc",
                    "vmid": ct.get("vmid"),
                    "name": ct.get("name", ""),
                    "node": ct.get("node", ""),
                    "status": ct.get("status", "unknown"),
                    "path": f"/compute/lxc",
                })
    except Exception:
        pass

    return {"results": results[:20]}
