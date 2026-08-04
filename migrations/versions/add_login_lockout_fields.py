"""Add login lockout fields to users

Revision ID: add_login_lockout_fields
Revises: add_product_locations
Create Date: 2026-08-03
"""

from alembic import op
import sqlalchemy as sa


revision = 'add_login_lockout_fields'
down_revision = 'add_product_locations'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'users',
        sa.Column('login_failed_attempts', sa.Integer(), nullable=False, server_default='0'),
    )
    op.add_column(
        'users',
        sa.Column('password_reset_required', sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        'users',
        sa.Column('password_reset_required_at', sa.DateTime(timezone=True), nullable=True),
    )


def downgrade():
    op.drop_column('users', 'password_reset_required_at')
    op.drop_column('users', 'password_reset_required')
    op.drop_column('users', 'login_failed_attempts')
