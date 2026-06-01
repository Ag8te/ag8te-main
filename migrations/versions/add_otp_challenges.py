"""Add OTP challenges table

Revision ID: add_otp_challenges
Revises: add_registration_review_status
Create Date: 2026-05-26

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = 'add_otp_challenges'
down_revision = 'add_registration_review_status'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'otp_challenges',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('purpose', sa.Text(), nullable=False),
        sa.Column('channel', sa.Text(), nullable=False),
        sa.Column('identifier', sa.Text(), nullable=False),
        sa.Column('code_hash', sa.Text(), nullable=True),
        sa.Column('firebase_uid', sa.Text(), nullable=True),
        sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('max_attempts', sa.Integer(), nullable=False, server_default='5'),
        sa.Column('used', sa.Boolean(), nullable=True, server_default=sa.false()),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.CheckConstraint("purpose IN ('login', 'payout', 'password_reset', 'payment_verification')", name='check_otp_purpose'),
        sa.CheckConstraint("channel IN ('email', 'sms')", name='check_otp_channel'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_otp_challenges_user_purpose', 'otp_challenges', ['user_id', 'purpose'])
    op.create_index('idx_otp_challenges_identifier', 'otp_challenges', ['identifier'])


def downgrade():
    op.drop_index('idx_otp_challenges_identifier', table_name='otp_challenges')
    op.drop_index('idx_otp_challenges_user_purpose', table_name='otp_challenges')
    op.drop_table('otp_challenges')
