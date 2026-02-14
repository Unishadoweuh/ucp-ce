"""Network, FirewallRule, and AuditLog models."""

from sqlalchemy import Integer, String, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime

from app.database import Base


class Network(Base):
    __tablename__ = "networks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    bridge: Mapped[str] = mapped_column(String(16), nullable=False)  # vmbr0, vmbr1...
    vlan_tag: Mapped[int] = mapped_column(Integer, nullable=True)
    subnet: Mapped[str] = mapped_column(String(32), nullable=True)  # 10.0.0.0/24
    gateway: Mapped[str] = mapped_column(String(64), nullable=True)
    dhcp_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    description: Mapped[str] = mapped_column(Text, default="")
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class FirewallRule(Base):
    __tablename__ = "firewall_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    network_id: Mapped[int] = mapped_column(Integer, ForeignKey("networks.id", ondelete="CASCADE"), nullable=False)
    direction: Mapped[str] = mapped_column(String(8), nullable=False)  # ingress | egress
    action: Mapped[str] = mapped_column(String(8), nullable=False)  # ALLOW | DENY
    protocol: Mapped[str] = mapped_column(String(8), nullable=False)  # tcp | udp | icmp | all
    port_range: Mapped[str] = mapped_column(String(32), nullable=True)  # 80,443 or 1000-2000
    source_cidr: Mapped[str] = mapped_column(String(32), default="0.0.0.0/0")
    target_tags: Mapped[str] = mapped_column(String(256), nullable=True)  # e.g. "web-server"
    priority: Mapped[int] = mapped_column(Integer, default=1000)
    description: Mapped[str] = mapped_column(Text, default="")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    action: Mapped[str] = mapped_column(String(64), nullable=False)  # e.g. "vm.create", "lxc.delete"
    resource_type: Mapped[str] = mapped_column(String(32), nullable=False)  # vm, lxc, network, user
    resource_id: Mapped[str] = mapped_column(String(64), nullable=True)  # vmid or resource identifier
    detail: Mapped[str] = mapped_column(Text, default="")
    ip_address: Mapped[str] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
