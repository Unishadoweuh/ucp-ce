"""Auth router — Google OAuth2 login and session management."""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database import get_db
from app.schemas.user import GoogleLoginRequest, AuthResponse, UserWithQuota, QuotaRead, QuotaUsage
from app.services.auth import verify_google_token, create_jwt, upsert_user, get_current_user
from app.services import proxmox
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])
limiter = Limiter(key_func=get_remote_address)


@router.post("/google", response_model=AuthResponse)
@limiter.limit("10/minute")
async def google_login(request: Request, body: GoogleLoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate with Google. First user becomes admin."""
    google_payload = verify_google_token(body.credential)
    user = await upsert_user(db, google_payload)
    token = create_jwt(user)

    quota_data = None
    if user.quota:
        quota_data = QuotaRead.model_validate(user.quota)

    return AuthResponse(
        token=token,
        user=UserWithQuota(
            id=user.id,
            google_id=user.google_id,
            email=user.email,
            name=user.name,
            picture=user.picture,
            role=user.role,
            quota=quota_data,
        ),
    )


@router.get("/me", response_model=UserWithQuota)
async def get_me(user: User = Depends(get_current_user)):
    """Return the current user + quota."""
    quota_data = None
    if user.quota:
        quota_data = QuotaRead.model_validate(user.quota)

    return UserWithQuota(
        id=user.id,
        google_id=user.google_id,
        email=user.email,
        name=user.name,
        picture=user.picture,
        role=user.role,
        quota=quota_data,
    )


@router.get("/me/usage", response_model=QuotaUsage)
async def get_my_usage(user: User = Depends(get_current_user)):
    """Return the current user's resource usage vs quota."""
    try:
        all_vms = proxmox.list_vms()
        my_vms = [
            v for v in all_vms
            if f"ucp-owner:{user.id}" in (v.get("tags", "") or "")
            and not v.get("template", 0)
        ]
    except Exception:
        my_vms = []

    used_vcpus = sum(v.get("cpus", 0) or v.get("maxcpu", 0) for v in my_vms)
    used_ram = sum((v.get("maxmem", 0) or 0) for v in my_vms)
    used_disk = sum((v.get("maxdisk", 0) or 0) for v in my_vms)

    quota = user.quota
    return QuotaUsage(
        used_vcpus=used_vcpus,
        used_ram_gb=round(used_ram / (1024**3), 1),
        used_disk_gb=round(used_disk / (1024**3), 1),
        max_vcpus=quota.max_vcpus if quota else 8,
        max_ram_gb=quota.max_ram_gb if quota else 16,
        max_disk_gb=quota.max_disk_gb if quota else 200,
    )
