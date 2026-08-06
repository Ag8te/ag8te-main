"""Add product locations

Revision ID: add_product_locations
Revises: merge_otp_panic_heads
Create Date: 2026-06-25

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'add_product_locations'
down_revision = 'merge_otp_panic_heads'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('shop_products', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                'locations',
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=True,
                server_default='[]',
            )
        )


def downgrade():
    with op.batch_alter_table('shop_products', schema=None) as batch_op:
        batch_op.drop_column('locations')
