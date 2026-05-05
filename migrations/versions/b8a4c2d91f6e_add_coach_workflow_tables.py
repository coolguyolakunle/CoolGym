"""add coach workflow tables

Revision ID: b8a4c2d91f6e
Revises: f94c7189f3e4
Create Date: 2026-05-05 18:45:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b8a4c2d91f6e'
down_revision = 'f94c7189f3e4'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'coach_client',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('coach_id', sa.Integer(), nullable=False),
        sa.Column('client_id', sa.Integer(), nullable=False),
        sa.Column('assigned_at', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['client_id'], ['user.id']),
        sa.ForeignKeyConstraint(['coach_id'], ['user.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table(
        'message',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('sender_id', sa.Integer(), nullable=False),
        sa.Column('receiver_id', sa.Integer(), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(['receiver_id'], ['user.id']),
        sa.ForeignKeyConstraint(['sender_id'], ['user.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table(
        'workout_plan',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('coach_id', sa.Integer(), nullable=False),
        sa.Column('client_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('weeks', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(['client_id'], ['user.id']),
        sa.ForeignKeyConstraint(['coach_id'], ['user.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table(
        'progress_log',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('plan_id', sa.Integer(), nullable=False),
        sa.Column('client_id', sa.Integer(), nullable=False),
        sa.Column('week', sa.Integer(), nullable=False),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('weight_kg', sa.Float(), nullable=True),
        sa.Column('sessions', sa.Integer(), nullable=True),
        sa.Column('rating', sa.Integer(), nullable=True),
        sa.Column('logged_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['client_id'], ['user.id']),
        sa.ForeignKeyConstraint(['plan_id'], ['workout_plan.id']),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('progress_log')
    op.drop_table('workout_plan')
    op.drop_table('message')
    op.drop_table('coach_client')
