"""Snapshots router — list, create, delete snapshots (auth + ownership)."""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from app.services import proxmox
from app.dependencies import get_current_user_vm

router = APIRouter(prefix="/snapshots", tags=["Snapshots"])


class SnapshotCreate(BaseModel):
    name: str
    description: Optional[str] = ""


@router.get("/{node}/{vmid}")
async def list_snapshots(node: str, vmid: int, vm: dict = Depends(get_current_user_vm)):
    """List snapshots for a VM (must be owner or admin)."""
    try:
        return proxmox.list_snapshots(node, vmid)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Proxmox error: {exc}")


@router.post("/{node}/{vmid}")
async def create_snapshot(
    node: str,
    vmid: int,
    body: SnapshotCreate,
    vm: dict = Depends(get_current_user_vm),
):
    """Create a snapshot (must be owner or admin)."""
    try:
        return proxmox.create_snapshot(node, vmid, body.name, body.description or "")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Proxmox error: {exc}")


@router.delete("/{node}/{vmid}/{snapname}")
async def delete_snapshot(
    node: str,
    vmid: int,
    snapname: str,
    vm: dict = Depends(get_current_user_vm),
):
    """Delete a snapshot (must be owner or admin)."""
    try:
        return proxmox.delete_snapshot(node, vmid, snapname)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Proxmox error: {exc}")
