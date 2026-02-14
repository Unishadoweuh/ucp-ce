"""Shared FastAPI dependencies for resource ownership verification."""

from fastapi import Depends, HTTPException
from app.services import proxmox
from app.models.user import User
from app.services.auth import get_current_user

OWNER_TAG_PREFIX = "ucp-owner:"


def _is_owner(resource: dict, user_id: int) -> bool:
    tags = resource.get("tags", "") or ""
    return f"{OWNER_TAG_PREFIX}{user_id}" in tags


async def get_current_user_vm(
    node: str,
    vmid: int,
    user: User = Depends(get_current_user),
) -> dict:
    """Verify the user owns the VM or is admin. Returns the VM dict."""
    try:
        vm = proxmox.get_vm(node, vmid)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Proxmox error: {exc}")
    if user.role != "admin" and not _is_owner(vm, user.id):
        raise HTTPException(status_code=403, detail="Access denied: not your resource")
    return vm


async def get_current_user_lxc(
    node: str,
    vmid: int,
    user: User = Depends(get_current_user),
) -> dict:
    """Verify the user owns the LXC or is admin. Returns the CT dict."""
    try:
        ct = proxmox.get_lxc(node, vmid)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Proxmox error: {exc}")
    if user.role != "admin" and not _is_owner(ct, user.id):
        raise HTTPException(status_code=403, detail="Access denied: not your resource")
    return ct
