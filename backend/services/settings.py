from __future__ import annotations

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession as Session

from models import UserSettings


async def get_or_create_user_settings(session: Session, user_id: int) -> UserSettings:
    statement = select(UserSettings).where(UserSettings.user_id == user_id)
    settings = (await session.exec(statement)).first()
    if settings:
        return settings
    settings = UserSettings(user_id=user_id)
    session.add(settings)
    await session.commit()
    await session.refresh(settings)
    return settings


async def get_user_settings_or_default(session: Session, user_id: int) -> UserSettings:
    statement = select(UserSettings).where(UserSettings.user_id == user_id)
    settings = (await session.exec(statement)).first()
    if settings:
        return settings
    return UserSettings(user_id=user_id)
