"""comprehensive_product_schema_fix

Revision ID: e3030e5d5f4b
Revises: a1fc627b1f96
Create Date: 2025-09-05 22:18:48.317973

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e3030e5d5f4b'
down_revision: Union[str, Sequence[str], None] = 'a1fc627b1f96'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema to match frontend expectations."""
    with op.batch_alter_table('product') as batch_op:
        # Add missing columns that frontend expects
        batch_op.add_column(sa.Column('status', sa.String(), nullable=False, default='active'))
        batch_op.add_column(sa.Column('current_stock', sa.Integer(), nullable=False, default=0))

        # Remove old columns that are no longer used
        batch_op.drop_column('phone_model')
        batch_op.drop_column('part_type')
        batch_op.drop_column('variant')

        # Ensure required columns have proper defaults and constraints
        # Make name and sku required (they should already be, but ensuring consistency)
        batch_op.alter_column('name', nullable=False)
        batch_op.alter_column('sku', nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('product') as batch_op:
        # Restore old columns
        batch_op.add_column(sa.Column('phone_model', sa.String(), nullable=False))
        batch_op.add_column(sa.Column('part_type', sa.String(), nullable=False))
        batch_op.add_column(sa.Column('variant', sa.String(), nullable=False))

        # Remove new columns
        batch_op.drop_column('status')
        batch_op.drop_column('current_stock')

        # Revert name and sku to nullable
        batch_op.alter_column('name', nullable=True)
        batch_op.alter_column('sku', nullable=True)
