"""Merge OTP and panic-alert migration heads.

Revision ID: merge_otp_panic_heads
Revises: add_otp_challenges, add_panic_alerts_table
Create Date: 2026-06-18

"""

revision = "merge_otp_panic_heads"
down_revision = ("add_otp_challenges", "add_panic_alerts_table")
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
