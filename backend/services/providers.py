from __future__ import annotations

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession as Session
from sqlalchemy import update

from models import Provider, ProviderAccount, ProviderStatus
from services.schemas.core import ClerkExternalAccount

CLERK_PROVIDER_MAP: dict[str, Provider] = {
    "github": Provider.GITHUB,
    "oauth_github": Provider.GITHUB,
}

SUPPORTED_PROVIDERS = [Provider.GITHUB]


def resolve_clerk_provider(provider: str) -> Provider | None:
    return CLERK_PROVIDER_MAP.get(provider.lower())


async def get_provider_accounts_for_user(session: Session, user_id: int):
    statement = (
        select(ProviderAccount)
        .where(ProviderAccount.user_id == user_id)
        .order_by(ProviderAccount.created_at.asc())
    )
    return (await session.exec(statement)).all()


async def get_provider_account(
    session: Session, user_id: int, provider: Provider
) -> ProviderAccount | None:
    statement = select(ProviderAccount).where(
        ProviderAccount.user_id == user_id,
        ProviderAccount.provider == provider,
    )
    return (await session.exec(statement)).first()


async def get_provider_account_by_provider_user_id(
    session: Session, provider: Provider, provider_user_id: str
) -> ProviderAccount | None:
    statement = select(ProviderAccount).where(
        ProviderAccount.provider == provider,
        ProviderAccount.provider_user_id == provider_user_id,
    )
    return (await session.exec(statement)).first()


async def connect_provider_for_user(
    session: Session,
    user_id: int,
    provider: Provider,
    provider_user_id: str,
    provider_username: str | None = None,
) -> ProviderAccount:
    account = await get_provider_account(session, user_id, provider)
    account_by_provider_user_id = await get_provider_account_by_provider_user_id(
        session, provider, provider_user_id
    )
    if (
        account
        and account_by_provider_user_id
        and account.id != account_by_provider_user_id.id
    ):
        await session.delete(account_by_provider_user_id)
        await session.flush()
    if account:
        account.provider_user_id = provider_user_id
        account.provider_username = provider_username
        account.status = ProviderStatus.ACTIVE
    elif account_by_provider_user_id:
        account = account_by_provider_user_id
        account.user_id = user_id
        account.provider_username = provider_username
        account.status = ProviderStatus.ACTIVE
    else:
        account = ProviderAccount(
            user_id=user_id,
            provider=provider,
            provider_user_id=provider_user_id,
            provider_username=provider_username,
            status=ProviderStatus.ACTIVE,
        )
    session.add(account)
    await session.commit()
    await session.refresh(account)
    if provider == Provider.GITHUB and account.status == ProviderStatus.ACTIVE:
        if account.provider_username:
            from services.github_installations import link_org_installations_for_user

            await link_org_installations_for_user(
                session,
                account.user_id,
                account.provider_username,
            )
    return account


async def disconnect_provider_for_user(
    session: Session, user_id: int, provider: Provider
) -> int:
    statement = (
        update(ProviderAccount)
        .where(ProviderAccount.user_id == user_id, ProviderAccount.provider == provider)
        .values(status=ProviderStatus.DISCONNECTED)
    )
    result = await session.exec(statement)
    await session.commit()
    return result.rowcount or 0


async def sync_provider_accounts_from_clerk(
    session: Session,
    user_id: int,
    external_accounts: list[ClerkExternalAccount] | None,
) -> None:
    if external_accounts is None:
        return

    account_by_provider: dict[Provider, ClerkExternalAccount] = {}
    for account in external_accounts:
        provider = resolve_clerk_provider(account.provider)
        if not provider:
            continue
        if provider not in account_by_provider:
            account_by_provider[provider] = account

    for provider in SUPPORTED_PROVIDERS:
        account = account_by_provider.get(provider)
        if account:
            await connect_provider_for_user(
                session,
                user_id,
                provider,
                account.provider_user_id,
                account.username,
            )
        else:
            await disconnect_provider_for_user(session, user_id, provider)
