"""Carousel and Footer CMS tables

Revision ID: c0ffee_carousel_footer
Revises: ba4d47693a29
Create Date: 2026-01-25

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision = 'c0ffee_carousel_footer'
down_revision = '9f2b8b4e021c'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'carousel_items',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('image_url', sa.Text(), nullable=True),
        sa.Column('cta_link', sa.Text(), nullable=True),
        sa.Column('cta_text', sa.String(120), nullable=True),
        sa.Column('order', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table(
        'footer_content',
        sa.Column('id', sa.Integer(), autoincrement=False, nullable=False),
        sa.Column('company_name', sa.String(255), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('phone', sa.String(80), nullable=True),
        sa.Column('physical_address', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.execute("INSERT INTO footer_content (id, company_name, created_at, updated_at) VALUES (1, 'AG8TE', NOW(), NOW()) ON CONFLICT (id) DO NOTHING")


def downgrade():
    op.drop_table('footer_content')
    op.drop_table('carousel_items')
