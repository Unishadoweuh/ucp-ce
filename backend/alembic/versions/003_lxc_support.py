"""003 — Add target column to machine_types and LXC support."""

from alembic import op
import sqlalchemy as sa

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "machine_types",
        sa.Column("target", sa.String(16), nullable=False, server_default="both"),
    )


def downgrade() -> None:
    op.drop_column("machine_types", "target")
