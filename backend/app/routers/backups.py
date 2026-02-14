"""Backups router — list Proxmox backups and restore (auth + ownership)."""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from app.services import proxmox
from app.dependencies import get_current_user_vm

router = APIRouter(prefix="/backups", tags=["Backups"])


class RestoreRequest(BaseModel):
    storage: Optional[str] = None


@router.get("/{node}/{vmid}")
async def list_backups(node: str, vmid: int, vm: dict = Depends(get_current_user_vm)):
    """List available backups for a VM (must be owner or admin)."""
    try:
        return proxmox.list_backups(node, vmid)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Proxmox error: {exc}")


@router.post("/{node}/{vmid}/restore")
async def restore_backup(
    node: str,
    vmid: int,
    volid: str,
    body: RestoreRequest = RestoreRequest(),
    vm: dict = Depends(get_current_user_vm),
):
    """Restore a VM from a backup (must be owner or admin)."""
    try:
        return proxmox.restore_backup(node, vmid, volid, storage=body.storage)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Proxmox error: {exc}")
