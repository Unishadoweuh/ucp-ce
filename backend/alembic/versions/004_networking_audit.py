"""004 — Add networks, firewall_rules, audit_logs tables."""

from alembic import op
import sqlalchemy as sa

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "networks",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(64), unique=True, nullable=False),
        sa.Column("bridge", sa.String(16), nullable=False),
        sa.Column("vlan_tag", sa.Integer, nullable=True),
        sa.Column("subnet", sa.String(32), nullable=True),
        sa.Column("gateway", sa.String(64), nullable=True),
        sa.Column("dhcp_enabled", sa.Boolean, server_default="false"),
        sa.Column("description", sa.Text, server_default=""),
        sa.Column("owner_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )

    op.create_table(
        "firewall_rules",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("network_id", sa.Integer, sa.ForeignKey("networks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("direction", sa.String(8), nullable=False),
        sa.Column("action", sa.String(8), nullable=False),
        sa.Column("protocol", sa.String(8), nullable=False),
        sa.Column("port_range", sa.String(32), nullable=True),
        sa.Column("source_cidr", sa.String(32), server_default="0.0.0.0/0"),
        sa.Column("target_tags", sa.String(256), nullable=True),
        sa.Column("priority", sa.Integer, server_default="1000"),
        sa.Column("description", sa.Text, server_default=""),
        sa.Column("enabled", sa.Boolean, server_default="true"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("action", sa.String(64), nullable=False),
        sa.Column("resource_type", sa.String(32), nullable=False),
        sa.Column("resource_id", sa.String(64), nullable=True),
        sa.Column("detail", sa.Text, server_default=""),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("firewall_rules")
    op.drop_table("networks")
