"""provider installation links

Revision ID: 8e8f2d1a5e3b
Revises: 2665c59a46d6
Create Date: 2026-01-22 14:57:40.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8e8f2d1a5e3b"
down_revision: Union[str, Sequence[str], None] = "2665c59a46d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "provider_installation_user",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("provider_installation_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["provider_installation_id"],
            ["provider_installation.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id",
            "provider_installation_id",
            name="uq_provider_installation_user",
        ),
    )
    op.create_index(
        "ix_provider_installation_user_user_id",
        "provider_installation_user",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "ix_provider_installation_user_installation_id",
        "provider_installation_user",
        ["provider_installation_id"],
        unique=False,
    )

    op.execute(
        """
        INSERT INTO provider_installation_user
            (user_id, provider_installation_id, created_at, updated_at)
        SELECT
            user_id,
            id,
            created_at,
            updated_at
        FROM provider_installation
        WHERE user_id IS NOT NULL
        """
    )

    with op.batch_alter_table("provider_installation") as batch_op:
        batch_op.drop_constraint(
            "provider_installation_user_id_fkey",
            type_="foreignkey",
        )
        batch_op.alter_column(
            "user_id",
            existing_type=sa.Integer(),
            nullable=True,
        )
        batch_op.create_foreign_key(
            "provider_installation_user_id_fkey",
            "user",
            ["user_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(
        """
        UPDATE provider_installation
        SET user_id = (
            SELECT provider_installation_user.user_id
            FROM provider_installation_user
            WHERE provider_installation_user.provider_installation_id = provider_installation.id
            ORDER BY provider_installation_user.created_at ASC
            LIMIT 1
        )
        WHERE user_id IS NULL
        """
    )

    with op.batch_alter_table("provider_installation") as batch_op:
        batch_op.drop_constraint(
            "provider_installation_user_id_fkey",
            type_="foreignkey",
        )
        batch_op.alter_column(
            "user_id",
            existing_type=sa.Integer(),
            nullable=False,
        )
        batch_op.create_foreign_key(
            "provider_installation_user_id_fkey",
            "user",
            ["user_id"],
            ["id"],
            ondelete="CASCADE",
        )

    op.drop_index(
        "ix_provider_installation_user_installation_id",
        table_name="provider_installation_user",
    )
    op.drop_index(
        "ix_provider_installation_user_user_id",
        table_name="provider_installation_user",
    )
    op.drop_table("provider_installation_user")
