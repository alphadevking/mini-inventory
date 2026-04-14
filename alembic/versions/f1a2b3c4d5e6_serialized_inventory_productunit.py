"""serialized_inventory_productunit

Revision ID: f1a2b3c4d5e6
Revises: e3030e5d5f4b
Create Date: 2026-04-13 00:00:00.000000

Gold Standard: Serialized Inventory Management.

Changes:
  - Create productunit table (one row per physical device)
  - Add unit_id FK to stockmovement (which unit moved)
  - Add unit_id FK to saleitem (which unit was sold)
  - Add unit_id FK to return (which unit was returned)
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'e3030e5d5f4b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- 1. Create productunit table ---
    op.create_table(
        'productunit',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('product_id', sa.Uuid(), sa.ForeignKey('product.id'), nullable=False, index=True),
        sa.Column('serial_number', sa.String(), nullable=False, unique=True, index=True),
        sa.Column('imei', sa.String(), nullable=True, unique=True, index=True),
        sa.Column('color', sa.String(), nullable=True),
        sa.Column('storage', sa.String(), nullable=True),
        sa.Column('condition', sa.String(), nullable=True, server_default='New'),
        sa.Column(
            'status',
            sa.Enum('in_stock', 'sold', 'returned', 'in_repair', 'reserved', name='unitstatus'),
            nullable=False,
            server_default='in_stock',
            index=True,
        ),
        sa.Column('purchase_cost', sa.Float(), nullable=False),
        sa.Column('purchased_at', sa.Date(), nullable=False),
        sa.Column('sold_at', sa.DateTime(), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('created_by', sa.Uuid(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )

    # --- 2. Add unit_id to stockmovement ---
    with op.batch_alter_table('stockmovement') as batch_op:
        batch_op.add_column(
            sa.Column('unit_id', sa.Uuid(), sa.ForeignKey('productunit.id'), nullable=True, index=True)
        )

    # --- 3. Add unit_id to saleitem ---
    with op.batch_alter_table('saleitem') as batch_op:
        batch_op.add_column(
            sa.Column('unit_id', sa.Uuid(), sa.ForeignKey('productunit.id'), nullable=True, index=True)
        )

    # --- 4. Add unit_id to return ---
    with op.batch_alter_table('return') as batch_op:
        batch_op.add_column(
            sa.Column('unit_id', sa.Uuid(), sa.ForeignKey('productunit.id'), nullable=True, index=True)
        )


def downgrade() -> None:
    with op.batch_alter_table('return') as batch_op:
        batch_op.drop_column('unit_id')

    with op.batch_alter_table('saleitem') as batch_op:
        batch_op.drop_column('unit_id')

    with op.batch_alter_table('stockmovement') as batch_op:
        batch_op.drop_column('unit_id')

    op.drop_table('productunit')

    # Drop the enum type (PostgreSQL only — SQLite ignores this)
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        sa.Enum(name='unitstatus').drop(bind, checkfirst=True)
