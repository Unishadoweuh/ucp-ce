"""Images router — list Proxmox templates (auth-required)."""

from fastapi import APIRouter, HTTPException, Depends

from app.services import proxmox
from app.services.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/images", tags=["Images"])


@router.get("")
async def list_images(user: User = Depends(get_current_user)):
    """List VM templates available for cloning (boot images)."""
    try:
        templates = proxmox.list_templates()
        return [
            {
                "vmid": t.get("vmid"),
                "name": t.get("name", f"template-{t.get('vmid')}"),
                "node": t.get("node", ""),
                "description": t.get("description", ""),
            }
            for t in templates
        ]
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Proxmox error: {exc}")
