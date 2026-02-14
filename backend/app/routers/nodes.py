"""Nodes router — list Proxmox nodes (auth-required)."""

from fastapi import APIRouter, HTTPException, Depends

from app.services import proxmox
from app.services.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/nodes", tags=["Nodes"])


@router.get("")
async def list_nodes(user: User = Depends(get_current_user)):
    """List Proxmox cluster nodes (mapped as regions/zones)."""
    try:
        nodes = proxmox.list_nodes()
        return [
            {
                "node": n["node"],
                "status": n.get("status", "unknown"),
                "cpu_usage": round(n.get("cpu", 0) * 100, 1),
                "memory_used_mb": round(n.get("mem", 0) / 1024 / 1024),
                "memory_max_mb": round(n.get("maxmem", 0) / 1024 / 1024),
            }
            for n in nodes
        ]
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Proxmox error: {exc}")
