"""add panic alerts table

Revision ID: add_panic_alerts_table
Revises: add_registration_review_status
Create Date: 2026-05-26

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "add_panic_alerts_table"
down_revision = "add_registration_review_status"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "panic_alerts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("booking_id", sa.Text(), sa.ForeignKey("service_requests.id", ondelete="SET NULL"), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("resolved_by_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolution_notes", sa.Text(), nullable=True),
        sa.Column("admin_email_sent", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("next_of_kin_email_sent", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("armed_response_ref", sa.String(100), nullable=True),
        sa.Column("armed_response_status", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_panic_alerts_user_id", "panic_alerts", ["user_id"])
    op.create_index("ix_panic_alerts_status", "panic_alerts", ["status"])
    op.create_index("ix_panic_alerts_created_at", "panic_alerts", ["created_at"])


def downgrade():
    op.drop_index("ix_panic_alerts_created_at", table_name="panic_alerts")
    op.drop_index("ix_panic_alerts_status", table_name="panic_alerts")
    op.drop_index("ix_panic_alerts_user_id", table_name="panic_alerts")
    op.drop_table("panic_alerts")