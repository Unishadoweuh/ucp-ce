"""Audit logs router — activity history."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List

from app.database import get_db
from app.models.network import AuditLog
from app.models.user import User
from app.services.auth import get_current_user

router = APIRouter(prefix="/audit", tags=["Audit"])


@router.get("")
async def list_audit_logs(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    resource_type: str = Query(default=""),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List audit logs. Admin sees all, user sees own actions."""
    query = select(AuditLog)
    if user.role != "admin":
        query = query.where(AuditLog.user_id == user.id)
    if resource_type:
        query = query.where(AuditLog.resource_type == resource_type)
    query = query.order_by(desc(AuditLog.created_at)).offset(offset).limit(limit)

    result = await db.execute(query)
    logs = result.scalars().all()

    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "detail": log.detail or "",
            "ip_address": log.ip_address or "",
            "created_at": log.created_at.isoformat() if log.created_at else "",
        }
        for log in logs
    ]
