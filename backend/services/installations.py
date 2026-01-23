from __future__ import annotations

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession as Session

from models import Provider, ProviderInstallation, ProviderInstallationUser


async def get_provider_installation_for_user(
    session: Session, user_id: int, provider: Provider
) -> ProviderInstallation | None:
    statement = (
        select(ProviderInstallation)
        .join(
            ProviderInstallationUser,
            ProviderInstallationUser.provider_installation_id == ProviderInstallation.id,
        )
        .where(
            ProviderInstallationUser.user_id == user_id,
            ProviderInstallation.provider == provider,
        )
        .order_by(ProviderInstallation.created_at.desc())
    )
    return (await session.exec(statement)).first()


async def get_provider_installations_for_user(
    session: Session, user_id: int
) -> list[ProviderInstallation]:
    statement = (
        select(ProviderInstallation)
        .join(
            ProviderInstallationUser,
            ProviderInstallationUser.provider_installation_id == ProviderInstallation.id,
        )
        .where(ProviderInstallationUser.user_id == user_id)
        .order_by(ProviderInstallation.created_at.desc())
    )
    return (await session.exec(statement)).all()


async def get_provider_installation_user_ids(
    session: Session, installation_id: int
) -> list[int]:
    statement = select(ProviderInstallationUser.user_id).where(
        ProviderInstallationUser.provider_installation_id == installation_id
    )
    results = (await session.exec(statement)).all()
    return [int(item[0] if isinstance(item, tuple) else item) for item in results]


async def link_provider_installation_users(
    session: Session,
    installation: ProviderInstallation,
    user_ids: list[int],
) -> list[int]:
    if not user_ids:
        return []

    statement = select(ProviderInstallationUser.user_id).where(
        ProviderInstallationUser.provider_installation_id == installation.id,
        ProviderInstallationUser.user_id.in_(user_ids),
    )
    existing = (await session.exec(statement)).all()
    existing_ids = {
        int(item[0] if isinstance(item, tuple) else item) for item in existing
    }
    new_ids = [user_id for user_id in user_ids if user_id not in existing_ids]
    if not new_ids:
        return []

    session.add_all(
        [
            ProviderInstallationUser(
                user_id=user_id,
                provider_installation_id=installation.id,
            )
            for user_id in new_ids
        ]
    )
    await session.commit()
    return new_ids


async def upsert_provider_installation(
    session: Session,
    *,
    provider: Provider,
    installation_id: str,
    owner_user_id: int | None,
    account_login: str,
    account_type: str,
    permissions: dict | None,
    existing: ProviderInstallation | None = None,
) -> ProviderInstallation:
    record = existing
    if record is None:
        record = (await session.exec(
            select(ProviderInstallation).where(
                ProviderInstallation.provider == provider,
                ProviderInstallation.installation_id == installation_id,
            )
        )).first()

    if record:
        if owner_user_id is not None and (
            record.user_id is None or record.user_id == owner_user_id
        ):
            record.user_id = owner_user_id
        record.account_login = account_login
        record.account_type = account_type
        record.permissions = permissions
        session.add(record)
        await session.commit()
        await session.refresh(record)
        return record

    record = ProviderInstallation(
        user_id=owner_user_id,
        provider=provider,
        installation_id=installation_id,
        account_login=account_login,
        account_type=account_type,
        permissions=permissions,
    )
    session.add(record)
    await session.commit()
    await session.refresh(record)
    return record
