"""add registration_rejection_reason to users

Revision ID: 20260518083329
Revises: b2ed1e555cf9  ← update to our actual latest revision id
Create Date: 2026-05-18
"""

from alembic import op
import sqlalchemy as sa

revision = '20260518083329'
down_revision = '18b269afd8c8'  # ← run `flask db heads` to confirm this
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'users',
        sa.Column('registration_rejection_reason', sa.Text(), nullable=True)
    )


def downgrade():
    op.drop_column('users', 'registration_rejection_reason')