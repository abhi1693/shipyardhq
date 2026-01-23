from __future__ import annotations

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession as Session

from models import Provider, ProviderInstallation
from services.github_app import GitHubAPIError, is_organization_member
from services.installations import link_provider_installation_users
from services.logger import AppLogger

logger = AppLogger.get_logger(__name__)


async def get_org_installations(session: Session) -> list[ProviderInstallation]:
    statement = select(ProviderInstallation).where(
        ProviderInstallation.provider == Provider.GITHUB,
        ProviderInstallation.account_type != "User",
    )
    return (await session.exec(statement)).all()


async def link_org_installations_for_user(
    session: Session, user_id: int, username: str
) -> list[ProviderInstallation]:
    if not username:
        return []

    installations = await get_org_installations(session)
    linked: list[ProviderInstallation] = []
    for installation in installations:
        org_login = installation.account_login
        if not org_login:
            continue
        try:
            is_member = await is_organization_member(
                installation.installation_id,
                org_login,
                username,
            )
        except GitHubAPIError:
            logger.warning(
                "org membership check failed",
                extra={
                    "installation_id": installation.installation_id,
                    "org_login": org_login,
                    "username": username,
                },
            )
            continue
        if not is_member:
            continue
        new_ids = await link_provider_installation_users(
            session,
            installation,
            [user_id],
        )
        if new_ids:
            if installation.user_id is None:
                installation.user_id = user_id
                session.add(installation)
                await session.commit()
            linked.append(installation)
    return linked
