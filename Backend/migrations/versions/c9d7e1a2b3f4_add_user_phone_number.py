"""add user phone number

Revision ID: c9d7e1a2b3f4
Revises: b8a4c2d91f6e
"""
from alembic import op
import sqlalchemy as sa

revision = 'c9d7e1a2b3f4'
down_revision = 'b8a4c2d91f6e'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('user') as batch_op:
        batch_op.add_column(sa.Column('phone_number', sa.String(length=30), nullable=True))


def downgrade():
    with op.batch_alter_table('user') as batch_op:
        batch_op.drop_column('phone_number')
