"""add registration_review_status to users

Revision ID: add_registration_review_status
Revises: 20260518083329
Create Date: 2026-05-19
"""

from alembic import op
import sqlalchemy as sa

revision = 'add_registration_review_status'
down_revision = '20260518083329'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'users',
        sa.Column(
            'registration_review_status',
            sa.Text(),
            nullable=True,
            server_default='pending'
        )
    )


def downgrade():
    op.drop_column('users', 'registration_review_status')