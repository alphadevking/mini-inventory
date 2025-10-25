"""flexible_product_system

Revision ID: flexible_product_system_001
Revises: e3574c3fcfb1
Create Date: 2025-01-01 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'flexible_product_system_001'
down_revision: Union[str, Sequence[str], None] = 'e3574c3fcfb1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema to flexible product system."""

    # Create new tables for the flexible product system

    # 1. Create productcategory table
    op.create_table('productcategory',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('icon', sa.String(), nullable=True),
        sa.Column('color', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('created_by', sa.Uuid(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_productcategory_name'), 'productcategory', ['name'], unique=True)

    # 2. Create productsubcategory table
    op.create_table('productsubcategory',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('category_id', sa.Uuid(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('icon', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('created_by', sa.Uuid(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['category_id'], ['productcategory.id'], ondelete='CASCADE')
    )
    op.create_index(op.f('ix_productsubcategory_name'), 'productsubcategory', ['name'])
    op.create_index(op.f('ix_productsubcategory_category_id'), 'productsubcategory', ['category_id'])

    # 3. Create productattributedefinition table
    op.create_table('productattributedefinition',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('subcategory_id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('display_name', sa.String(), nullable=False),
        sa.Column('data_type', sa.String(), nullable=False, default='string'),
        sa.Column('required', sa.Boolean(), nullable=False, default=False),
        sa.Column('default_value', sa.String(), nullable=True),
        sa.Column('validation_rules', sa.JSON(), nullable=True),
        sa.Column('options', sa.JSON(), nullable=True),
        sa.Column('unit', sa.String(), nullable=True),
        sa.Column('order', sa.Integer(), nullable=False, default=0),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['subcategory_id'], ['productsubcategory.id'], ondelete='CASCADE')
    )
    op.create_index(op.f('ix_productattributedefinition_name'), 'productattributedefinition', ['name'])
    op.create_index(op.f('ix_productattributedefinition_subcategory_id'), 'productattributedefinition', ['subcategory_id'])

    # 4. Update existing product table to new structure using batch mode for SQLite
    with op.batch_alter_table('product') as batch_op:
        # Add new columns
        batch_op.add_column(sa.Column('name', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('category_id', sa.Uuid(), nullable=True))
        batch_op.add_column(sa.Column('subcategory_id', sa.Uuid(), nullable=True))
        batch_op.add_column(sa.Column('brand', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('model', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('sku', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('dimensions', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('weight', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('weight_unit', sa.String(), nullable=True, default='g'))
        batch_op.add_column(sa.Column('attributes', sa.JSON(), nullable=True))

        # Create indexes for new columns
        batch_op.create_index('ix_product_name', ['name'])
        batch_op.create_index('ix_product_sku', ['sku'], unique=True)
        batch_op.create_index('ix_product_category_id', ['category_id'])
        batch_op.create_index('ix_product_subcategory_id', ['subcategory_id'])

    # 5. Insert default categories and subcategories
    # This will be done in the application code via the /api/categories/initialize endpoint

    # 6. Update existing products to use new structure (migration data)
    # For now, we'll set default values and let users update them
    op.execute("""
        UPDATE product
        SET name = phone_model || ' - ' || part_type || ' (' || variant || ')',
            sku = 'MIGRATED-' || CAST(id AS TEXT)
        WHERE name IS NULL
    """)

    # 7. Make new columns required after data migration
    # Note: This should be done carefully in production
    # op.alter_column('product', 'name', nullable=False)
    # op.alter_column('product', 'sku', nullable=False)


def downgrade() -> None:
    """Downgrade schema back to old product system."""

    # Remove foreign key constraints
    op.drop_constraint('fk_product_subcategory', 'product', type_='foreignkey')
    op.drop_constraint('fk_product_category', 'product', type_='foreignkey')

    # Remove indexes
    op.drop_index(op.f('ix_product_subcategory_id'), table_name='product')
    op.drop_index(op.f('ix_product_category_id'), table_name='product')
    op.drop_index(op.f('ix_product_sku'), table_name='product')
    op.drop_index(op.f('ix_product_name'), table_name='product')

    # Remove new columns
    op.drop_column('product', 'attributes')
    op.drop_column('product', 'weight_unit')
    op.drop_column('product', 'weight')
    op.drop_column('product', 'dimensions')
    op.drop_column('product', 'sku')
    op.drop_column('product', 'model')
    op.drop_column('product', 'brand')
    op.drop_column('product', 'subcategory_id')
    op.drop_column('product', 'category_id')
    op.drop_column('product', 'name')

    # Drop new tables
    op.drop_table('productattributedefinition')
    op.drop_table('productsubcategory')
    op.drop_table('productcategory')
