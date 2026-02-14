"""005 — Add status column to users for approval workflow."""

from alembic import op
import sqlalchemy as sa

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("status", sa.String(16), nullable=False, server_default="approved"))


def downgrade():
    op.drop_column("users", "status")
