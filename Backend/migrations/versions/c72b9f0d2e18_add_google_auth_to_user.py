"""add Google authentication fields to user

Revision ID: c72b9f0d2e18
Revises: c9d7e1a2b3f4
Create Date: 2026-09-13 15:30:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = 'c72b9f0d2e18'
down_revision = 'c9d7e1a2b3f4'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('user') as batch_op:
        batch_op.add_column(sa.Column('google_id', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('google_email', sa.String(length=120), nullable=True))
        batch_op.add_column(sa.Column('auth_provider', sa.String(length=20), nullable=False, server_default='password'))
        batch_op.create_unique_constraint('uq_user_google_id', ['google_id'])


def downgrade():
    with op.batch_alter_table('user') as batch_op:
        batch_op.drop_constraint('uq_user_google_id', type_='unique')
        batch_op.drop_column('auth_provider')
        batch_op.drop_column('google_email')
        batch_op.drop_column('google_id')
