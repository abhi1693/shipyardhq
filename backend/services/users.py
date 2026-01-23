from __future__ import annotations

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession as Session

from models import User
from services.handles import normalize_handle
from services.providers import sync_provider_accounts_from_clerk
from services.schemas.core import ClerkProfile


def build_display_name(user: ClerkProfile) -> str | None:
    if user.full_name:
        return user.full_name
    parts = [part for part in [user.first_name, user.last_name] if part]
    if parts:
        return " ".join(parts)
    return user.username or None


_UNSET = object()


async def ensure_user_from_clerk(
    session: Session,
    user: ClerkProfile | None,
) -> User | None:
    if not user:
        return None

    display_name = build_display_name(user)
    db_user = await get_or_create_user_by_clerk_id(
        session,
        user.id,
        display_name=display_name,
        avatar_url=user.image_url,
    )

    await sync_provider_accounts_from_clerk(session, db_user.id, user.external_accounts)
    return db_user


async def get_or_create_user_by_clerk_id(
    session: Session,
    clerk_id: str,
    *,
    display_name: str | None | object = _UNSET,
    avatar_url: str | None | object = _UNSET,
) -> User:
    statement = select(User).where(User.clerk_id == clerk_id)
    db_user = (await session.exec(statement)).first()
    created = False
    if not db_user:
        db_user = User(clerk_id=clerk_id)
        session.add(db_user)
        created = True

    updated = False
    if display_name is not _UNSET and db_user.display_name != display_name:
        db_user.display_name = display_name
        updated = True
    if avatar_url is not _UNSET and db_user.avatar_url != avatar_url:
        db_user.avatar_url = avatar_url
        updated = True

    if created or updated:
        await session.commit()
        await session.refresh(db_user)

    return db_user


async def get_user_by_clerk_id(session: Session, clerk_id: str) -> User | None:
    statement = select(User).where(User.clerk_id == clerk_id)
    return (await session.exec(statement)).first()


async def get_user_by_handle(session: Session, handle: str | None) -> User | None:
    normalized = normalize_handle(handle)
    if not normalized:
        return None
    statement = select(User).where(User.handle == normalized)
    return (await session.exec(statement)).first()
