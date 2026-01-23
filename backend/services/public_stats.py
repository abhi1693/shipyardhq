from __future__ import annotations

from sqlalchemy import func
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession as Session

import models
from services.schemas.public_stats import PublicStatsResponse


async def _count_value(session: Session, statement) -> int:
    result = await session.exec(statement)
    value = result.one()
    if isinstance(value, tuple):
        value = value[0]
    return int(value or 0)


async def build_public_stats(session: Session) -> PublicStatsResponse:
    users = await _count_value(session, select(func.count()).select_from(models.User))
    repos = await _count_value(
        session, select(func.count()).select_from(models.Repository)
    )
    activities = await _count_value(
        session, select(func.count()).select_from(models.ActivityItem)
    )
    installations = await _count_value(
        session, select(func.count()).select_from(models.ProviderInstallation)
    )
    return PublicStatsResponse(
        users=users,
        repos=repos,
        activities=activities,
        installations=installations,
    )
