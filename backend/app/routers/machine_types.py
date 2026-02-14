"""Machine types router — list + admin CRUD."""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.schemas.machine_type import MachineTypeRead
from app.models.machine_type import MachineType
from app.models.user import User
from app.database import get_db
from app.services.auth import get_current_user, require_admin

router = APIRouter(prefix="/machine-types", tags=["Machine Types"])


@router.get("", response_model=List[MachineTypeRead])
async def list_machine_types(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all machine type presets."""
    result = await db.execute(select(MachineType).order_by(MachineType.series, MachineType.vcpus))
    return result.scalars().all()


@router.post("", response_model=MachineTypeRead, status_code=201)
async def create_machine_type(
    name: str,
    series: str,
    vcpus: int,
    memory_mb: int,
    description: str | None = None,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a machine type (admin-only)."""
    mt = MachineType(name=name, series=series, vcpus=vcpus, memory_mb=memory_mb, description=description)
    db.add(mt)
    await db.commit()
    await db.refresh(mt)
    return mt


@router.put("/{mt_id}", response_model=MachineTypeRead)
async def update_machine_type(
    mt_id: int,
    name: str | None = None,
    series: str | None = None,
    vcpus: int | None = None,
    memory_mb: int | None = None,
    description: str | None = None,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a machine type (admin-only)."""
    result = await db.execute(select(MachineType).where(MachineType.id == mt_id))
    mt = result.scalar_one_or_none()
    if mt is None:
        raise HTTPException(status_code=404, detail="Machine type not found")

    if name is not None:
        mt.name = name
    if series is not None:
        mt.series = series
    if vcpus is not None:
        mt.vcpus = vcpus
    if memory_mb is not None:
        mt.memory_mb = memory_mb
    if description is not None:
        mt.description = description

    await db.commit()
    await db.refresh(mt)
    return mt


@router.delete("/{mt_id}")
async def delete_machine_type(
    mt_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a machine type (admin-only)."""
    result = await db.execute(select(MachineType).where(MachineType.id == mt_id))
    mt = result.scalar_one_or_none()
    if mt is None:
        raise HTTPException(status_code=404, detail="Machine type not found")

    await db.delete(mt)
    await db.commit()
    return {"status": "deleted"}
