from __future__ import annotations

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession as Session

from models import User
from services.schemas.core import ClerkProfile

_UNSET = object()


def _split_full_name(full_name: str | None) -> tuple[str | None, str | None]:
    if not full_name:
        return None, None
    parts = [part for part in full_name.split(" ") if part]
    if not parts:
        return None, None
    if len(parts) == 1:
        return parts[0], None
    return parts[0], " ".join(parts[1:])


async def get_or_create_user_by_clerk_id(
    session: Session,
    clerk_id: str,
    *,
    email: str | None | object = _UNSET,
    first_name: str | None | object = _UNSET,
    last_name: str | None | object = _UNSET,
) -> User:
    statement = select(User).where(User.clerk_id == clerk_id)
    db_user = (await session.exec(statement)).first()
    created = False
    if not db_user:
        db_user = User(clerk_id=clerk_id)
        session.add(db_user)
        created = True

    updated = False
    if email is not _UNSET and db_user.email != email:
        db_user.email = email  # type: ignore[assignment]
        updated = True
    if first_name is not _UNSET and db_user.first_name != first_name:
        db_user.first_name = first_name  # type: ignore[assignment]
        updated = True
    if last_name is not _UNSET and db_user.last_name != last_name:
        db_user.last_name = last_name  # type: ignore[assignment]
        updated = True

    if created or updated:
        await session.commit()
        await session.refresh(db_user)

    return db_user


async def get_user_by_clerk_id(session: Session, clerk_id: str) -> User | None:
    statement = select(User).where(User.clerk_id == clerk_id)
    return (await session.exec(statement)).first()


async def ensure_user_from_clerk(
    session: Session,
    user: ClerkProfile | None,
) -> User | None:
    if not user:
        return None

    first_name = user.first_name
    last_name = user.last_name
    if not first_name and not last_name:
        first_name, last_name = _split_full_name(user.full_name)

    return await get_or_create_user_by_clerk_id(
        session,
        user.id,
        first_name=first_name,
        last_name=last_name,
    )
