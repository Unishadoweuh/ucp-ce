"""Storage router — list Proxmox storage pools (auth-required)."""

from fastapi import APIRouter, HTTPException, Depends

from app.services import proxmox
from app.services.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/storage", tags=["Storage"])


@router.get("")
async def list_storage(node: str | None = None, user: User = Depends(get_current_user)):
    """List available storage pools."""
    try:
        storages = proxmox.list_storage(node=node)
        return [
            {
                "storage": s.get("storage"),
                "type": s.get("type"),
                "content": s.get("content", ""),
                "total_gb": round(s.get("total", 0) / (1024**3), 1) if s.get("total") else 0,
                "used_gb": round(s.get("used", 0) / (1024**3), 1) if s.get("used") else 0,
                "avail_gb": round(s.get("avail", 0) / (1024**3), 1) if s.get("avail") else 0,
                "node": s.get("node", node or ""),
            }
            for s in storages
        ]
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Proxmox error: {exc}")
