"""Networks router — VPC-style network management."""

from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel
from typing import Optional, List
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database import get_db
from app.models.network import Network, FirewallRule, AuditLog
from app.models.user import User
from app.services.auth import get_current_user
from app.services import proxmox

router = APIRouter(prefix="/networks", tags=["Networks"])
limiter = Limiter(key_func=get_remote_address)


# ── Schemas ──────────────────────────────────────────────────
class CreateNetworkRequest(BaseModel):
    name: str
    bridge: str = "vmbr0"
    vlan_tag: Optional[int] = None
    subnet: Optional[str] = None
    gateway: Optional[str] = None
    dhcp_enabled: bool = False
    description: str = ""


class NetworkRead(BaseModel):
    id: int
    name: str
    bridge: str
    vlan_tag: Optional[int]
    subnet: Optional[str]
    gateway: Optional[str]
    dhcp_enabled: bool
    description: str
    owner_id: int
    created_at: str

    class Config:
        from_attributes = True


class CreateFirewallRuleRequest(BaseModel):
    direction: str = "ingress"  # ingress | egress
    action: str = "ALLOW"  # ALLOW | DENY
    protocol: str = "tcp"  # tcp | udp | icmp | all
    port_range: Optional[str] = None
    source_cidr: str = "0.0.0.0/0"
    target_tags: Optional[str] = None
    priority: int = 1000
    description: str = ""


class FirewallRuleRead(BaseModel):
    id: int
    network_id: int
    direction: str
    action: str
    protocol: str
    port_range: Optional[str]
    source_cidr: str
    target_tags: Optional[str]
    priority: int
    description: str
    enabled: bool

    class Config:
        from_attributes = True


async def _log_action(db: AsyncSession, user: User, action: str, resource_type: str, resource_id: str, detail: str = "", ip: str = ""):
    log = AuditLog(
        user_id=user.id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        detail=detail,
        ip_address=ip,
    )
    db.add(log)
    await db.commit()


# ── Network CRUD ─────────────────────────────────────────────

@router.get("", response_model=List[NetworkRead])
async def list_networks(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List networks. Admin sees all, user sees own."""
    if user.role == "admin":
        result = await db.execute(select(Network).order_by(Network.created_at.desc()))
    else:
        result = await db.execute(
            select(Network).where(Network.owner_id == user.id).order_by(Network.created_at.desc())
        )
    networks = result.scalars().all()
    return [
        NetworkRead(
            id=n.id, name=n.name, bridge=n.bridge, vlan_tag=n.vlan_tag,
            subnet=n.subnet, gateway=n.gateway, dhcp_enabled=n.dhcp_enabled,
            description=n.description or "", owner_id=n.owner_id,
            created_at=n.created_at.isoformat() if n.created_at else "",
        )
        for n in networks
    ]


@router.post("", status_code=201, response_model=NetworkRead)
@limiter.limit("5/minute")
async def create_network(
    request: Request,
    body: CreateNetworkRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a VPC network."""
    # Check name uniqueness
    existing = await db.execute(select(Network).where(Network.name == body.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Network '{body.name}' already exists")

    # Validate bridge exists on Proxmox
    try:
        nodes = proxmox.list_nodes()
        if nodes:
            pve = proxmox._get_proxmox()
            node_name = nodes[0]["node"]
            bridges = pve.nodes(node_name).network.get(type="bridge")
            bridge_names = [b.get("iface", "") for b in bridges]
            if body.bridge not in bridge_names:
                raise HTTPException(
                    status_code=400,
                    detail=f"Bridge '{body.bridge}' not found on Proxmox. Available: {bridge_names}"
                )
    except HTTPException:
        raise
    except Exception:
        pass  # If we can't validate, allow creation

    network = Network(
        name=body.name,
        bridge=body.bridge,
        vlan_tag=body.vlan_tag,
        subnet=body.subnet,
        gateway=body.gateway,
        dhcp_enabled=body.dhcp_enabled,
        description=body.description,
        owner_id=user.id,
    )
    db.add(network)
    await db.commit()
    await db.refresh(network)

    await _log_action(db, user, "network.create", "network", str(network.id), f"Created network '{body.name}' on {body.bridge}", request.client.host if request.client else "")

    return NetworkRead(
        id=network.id, name=network.name, bridge=network.bridge, vlan_tag=network.vlan_tag,
        subnet=network.subnet, gateway=network.gateway, dhcp_enabled=network.dhcp_enabled,
        description=network.description or "", owner_id=network.owner_id,
        created_at=network.created_at.isoformat() if network.created_at else "",
    )


@router.delete("/{network_id}")
async def delete_network(
    network_id: int,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a network (owner or admin)."""
    result = await db.execute(select(Network).where(Network.id == network_id))
    network = result.scalar_one_or_none()
    if not network:
        raise HTTPException(status_code=404, detail="Network not found")
    if user.role != "admin" and network.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not your network")

    await _log_action(db, user, "network.delete", "network", str(network_id), f"Deleted network '{network.name}'", request.client.host if request.client else "")
    await db.delete(network)
    await db.commit()
    return {"status": "deleted"}


# ── Proxmox Bridges ─────────────────────────────────────────

@router.get("/bridges")
async def list_bridges(user: User = Depends(get_current_user)):
    """List available Proxmox bridges for network creation."""
    try:
        pve = proxmox._get_proxmox()
        nodes = proxmox.list_nodes()
        all_bridges = []
        for n in nodes:
            try:
                bridges = pve.nodes(n["node"]).network.get(type="bridge")
                for b in bridges:
                    all_bridges.append({
                        "node": n["node"],
                        "iface": b.get("iface", ""),
                        "address": b.get("address", ""),
                        "netmask": b.get("netmask", ""),
                        "gateway": b.get("gateway", ""),
                        "active": b.get("active", 0),
                        "comments": b.get("comments", ""),
                    })
            except Exception:
                pass
        return all_bridges
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Proxmox error: {exc}")


# ── Firewall Rules CRUD ─────────────────────────────────────

@router.get("/{network_id}/rules", response_model=List[FirewallRuleRead])
async def list_firewall_rules(
    network_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List firewall rules for a network."""
    # Verify network ownership
    result = await db.execute(select(Network).where(Network.id == network_id))
    network = result.scalar_one_or_none()
    if not network:
        raise HTTPException(status_code=404, detail="Network not found")
    if user.role != "admin" and network.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not your network")

    rules = await db.execute(
        select(FirewallRule)
        .where(FirewallRule.network_id == network_id)
        .order_by(FirewallRule.priority)
    )
    return [FirewallRuleRead.model_validate(r) for r in rules.scalars().all()]


@router.post("/{network_id}/rules", status_code=201, response_model=FirewallRuleRead)
async def create_firewall_rule(
    network_id: int,
    body: CreateFirewallRuleRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a firewall rule for a network."""
    result = await db.execute(select(Network).where(Network.id == network_id))
    network = result.scalar_one_or_none()
    if not network:
        raise HTTPException(status_code=404, detail="Network not found")
    if user.role != "admin" and network.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not your network")

    if body.direction not in ("ingress", "egress"):
        raise HTTPException(status_code=400, detail="direction must be 'ingress' or 'egress'")
    if body.action not in ("ALLOW", "DENY"):
        raise HTTPException(status_code=400, detail="action must be 'ALLOW' or 'DENY'")
    if body.protocol not in ("tcp", "udp", "icmp", "all"):
        raise HTTPException(status_code=400, detail="protocol must be tcp, udp, icmp, or all")

    rule = FirewallRule(
        network_id=network_id,
        direction=body.direction,
        action=body.action,
        protocol=body.protocol,
        port_range=body.port_range,
        source_cidr=body.source_cidr,
        target_tags=body.target_tags,
        priority=body.priority,
        description=body.description,
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)

    await _log_action(db, user, "firewall.create", "firewall_rule", str(rule.id), f"{body.action} {body.protocol} {body.port_range or 'all'} from {body.source_cidr}", request.client.host if request.client else "")

    return FirewallRuleRead.model_validate(rule)


@router.delete("/{network_id}/rules/{rule_id}")
async def delete_firewall_rule(
    network_id: int,
    rule_id: int,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a firewall rule."""
    result = await db.execute(select(Network).where(Network.id == network_id))
    network = result.scalar_one_or_none()
    if not network:
        raise HTTPException(status_code=404, detail="Network not found")
    if user.role != "admin" and network.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not your network")

    rule_result = await db.execute(
        select(FirewallRule).where(FirewallRule.id == rule_id, FirewallRule.network_id == network_id)
    )
    rule = rule_result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Firewall rule not found")

    await _log_action(db, user, "firewall.delete", "firewall_rule", str(rule_id), "", request.client.host if request.client else "")
    await db.delete(rule)
    await db.commit()
    return {"status": "deleted"}
