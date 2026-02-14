"""Monitoring Alerts — Threshold-based alerting for resources."""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import Base, get_db
from app.services.auth import get_current_user
from app.services import proxmox
from app.models.user import User

router = APIRouter(prefix="/alerts", tags=["Alerts"])


# ── In-memory alert rules (lightweight, no migration needed) ────────
class AlertRuleCreate(BaseModel):
    name: str
    resource_type: str  # "vm" or "lxc"
    vmid: int
    node: str
    metric: str  # "cpu", "memory", "disk"
    operator: str  # "gt", "lt"
    threshold: float  # percentage (0-100)
    enabled: bool = True


class AlertRuleRead(AlertRuleCreate):
    id: int
    owner_id: int
    created_at: str
    last_triggered: Optional[str] = None


# Simple in-memory store (persists per-process, could be DB-backed later)
_alert_rules: list[dict] = []
_next_id = 1


@router.get("/rules")
async def list_rules(user: User = Depends(get_current_user)):
    """List alert rules for the current user."""
    return [r for r in _alert_rules if r["owner_id"] == user.id]


@router.post("/rules", status_code=201)
async def create_rule(rule: AlertRuleCreate, user: User = Depends(get_current_user)):
    """Create a new alert rule."""
    global _next_id
    new_rule = {
        "id": _next_id,
        "owner_id": user.id,
        **rule.model_dump(),
        "created_at": datetime.utcnow().isoformat(),
        "last_triggered": None,
    }
    _alert_rules.append(new_rule)
    _next_id += 1
    return new_rule


@router.delete("/rules/{rule_id}")
async def delete_rule(rule_id: int, user: User = Depends(get_current_user)):
    """Delete an alert rule."""
    global _alert_rules
    rule = next((r for r in _alert_rules if r["id"] == rule_id), None)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    if rule["owner_id"] != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not your rule")
    _alert_rules = [r for r in _alert_rules if r["id"] != rule_id]
    return {"status": "deleted"}


@router.get("/check")
async def check_alerts(user: User = Depends(get_current_user)):
    """Check all rules for the current user and return triggered alerts."""
    user_rules = [r for r in _alert_rules if r["owner_id"] == user.id and r["enabled"]]
    triggered = []

    for rule in user_rules:
        try:
            if rule["resource_type"] == "lxc":
                resource = proxmox.get_lxc(rule["node"], rule["vmid"])
            else:
                resource = proxmox.get_vm(rule["node"], rule["vmid"])

            # Calculate current metric value
            current_value = 0.0
            if rule["metric"] == "cpu":
                current_value = (resource.get("cpu", 0) or 0) * 100
            elif rule["metric"] == "memory":
                maxmem = resource.get("maxmem", 1) or 1
                mem = resource.get("mem", 0) or 0
                current_value = (mem / maxmem) * 100
            elif rule["metric"] == "disk":
                maxdisk = resource.get("maxdisk", 1) or 1
                disk = resource.get("disk", 0) or 0
                current_value = (disk / maxdisk) * 100

            # Check threshold
            is_triggered = False
            if rule["operator"] == "gt" and current_value > rule["threshold"]:
                is_triggered = True
            elif rule["operator"] == "lt" and current_value < rule["threshold"]:
                is_triggered = True

            if is_triggered:
                rule["last_triggered"] = datetime.utcnow().isoformat()
                triggered.append({
                    "rule": rule,
                    "current_value": round(current_value, 1),
                    "resource_name": resource.get("name", f"{rule['resource_type']}-{rule['vmid']}"),
                })
        except Exception:
            continue

    return {
        "checked": len(user_rules),
        "triggered": triggered,
        "checked_at": datetime.utcnow().isoformat(),
    }
