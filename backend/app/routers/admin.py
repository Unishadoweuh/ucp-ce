"""Admin router — user management, storage configs (admin-only)."""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.services.auth import require_admin
from app.models.user import User, Quota
from app.models.storage_config import StorageConfig
from app.schemas.user import UserWithQuota, QuotaRead, QuotaUpdate, RoleUpdate, StatusUpdate
from app.schemas.storage_config import StorageConfigRead, StorageConfigCreate, StorageConfigUpdate

router = APIRouter(prefix="/admin", tags=["Administration"])


# ── User Management ─────────────────────────────────────────
@router.get("/users", response_model=List[UserWithQuota])
async def list_users(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """List all users with their quotas."""
    result = await db.execute(select(User).order_by(User.created_at))
    users = result.scalars().all()
    return [
        UserWithQuota(
            id=u.id, google_id=u.google_id, email=u.email, name=u.name,
            picture=u.picture, role=u.role, status=u.status,
            quota=QuotaRead.model_validate(u.quota) if u.quota else None,
        )
        for u in users
    ]


@router.put("/users/{user_id}/quota", response_model=QuotaRead)
async def update_user_quota(
    user_id: int,
    body: QuotaUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a user's resource quota."""
    result = await db.execute(select(Quota).where(Quota.user_id == user_id))
    quota = result.scalar_one_or_none()
    if quota is None:
        raise HTTPException(status_code=404, detail="Quota not found")

    if body.max_vcpus is not None:
        quota.max_vcpus = body.max_vcpus
    if body.max_ram_gb is not None:
        quota.max_ram_gb = body.max_ram_gb
    if body.max_disk_gb is not None:
        quota.max_disk_gb = body.max_disk_gb
    if body.allowed_networks is not None:
        quota.allowed_networks = body.allowed_networks

    await db.commit()
    await db.refresh(quota)
    return QuotaRead.model_validate(quota)


@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: int,
    body: RoleUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Promote or demote a user."""
    if body.role not in ("admin", "user"):
        raise HTTPException(status_code=400, detail="Role must be 'admin' or 'user'")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = body.role
    await db.commit()
    return {"id": user_id, "role": body.role}


@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: int,
    body: StatusUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Approve or reject a user."""
    if body.status not in ("approved", "rejected", "pending"):
        raise HTTPException(status_code=400, detail="Status must be 'approved', 'rejected', or 'pending'")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    user.status = body.status
    await db.commit()
    return {"id": user_id, "status": body.status}


# ── Storage Config ───────────────────────────────────────────
@router.get("/storage-configs", response_model=List[StorageConfigRead])
async def list_storage_configs(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """List all storage config mappings."""
    result = await db.execute(select(StorageConfig).order_by(StorageConfig.node, StorageConfig.storage_name))
    return result.scalars().all()


@router.post("/storage-configs", response_model=StorageConfigRead, status_code=201)
async def create_storage_config(
    body: StorageConfigCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a storage config mapping."""
    sc = StorageConfig(
        storage_name=body.storage_name,
        role=body.role,
        node=body.node,
        description=body.description,
    )
    db.add(sc)
    await db.commit()
    await db.refresh(sc)
    return sc


@router.put("/storage-configs/{config_id}", response_model=StorageConfigRead)
async def update_storage_config(
    config_id: int,
    body: StorageConfigUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a storage config."""
    result = await db.execute(select(StorageConfig).where(StorageConfig.id == config_id))
    sc = result.scalar_one_or_none()
    if sc is None:
        raise HTTPException(status_code=404, detail="Storage config not found")

    if body.role is not None:
        sc.role = body.role
    if body.description is not None:
        sc.description = body.description

    await db.commit()
    await db.refresh(sc)
    return sc


@router.delete("/storage-configs/{config_id}")
async def delete_storage_config(
    config_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a storage config."""
    result = await db.execute(select(StorageConfig).where(StorageConfig.id == config_id))
    sc = result.scalar_one_or_none()
    if sc is None:
        raise HTTPException(status_code=404, detail="Storage config not found")

    await db.delete(sc)
    await db.commit()
    return {"status": "deleted"}
