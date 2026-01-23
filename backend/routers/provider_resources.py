from __future__ import annotations

from fastapi import APIRouter
from sqlmodel.ext.asyncio.session import AsyncSession as Session

from integrations.registry import get_provider_adapter
from models import ProviderAccount, ProviderInstallation, ProviderInstallationUser
from routers.base import api_prefix
from routers.generics import UserProviderScopedListRetrieveAPIView
from services.schemas.resources import ProviderAccountResource, ProviderInstallationResource


def resolve_provider_value(provider: str):
    adapter = get_provider_adapter(provider)
    return adapter.provider


class ProviderAccountsView(UserProviderScopedListRetrieveAPIView):
    model = ProviderAccount
    serializer_class = ProviderAccountResource

    def __init__(self) -> None:
        super().__init__(
            prefix=api_prefix("providers", "{provider}", "accounts"),
            tags=["providers"],
        )

    def resolve_provider(self, provider: str):
        return resolve_provider_value(provider)


class ProviderInstallationsView(UserProviderScopedListRetrieveAPIView):
    model = ProviderInstallation
    serializer_class = ProviderInstallationResource

    def __init__(self) -> None:
        super().__init__(
            prefix=api_prefix("providers", "{provider}", "installations"),
            tags=["providers"],
        )

    def resolve_provider(self, provider: str):
        return resolve_provider_value(provider)

    async def get_scoped_queryset(self, session: Session, user_id: int, provider):
        queryset = await self._resolve_queryset(session)
        if hasattr(queryset, "where"):
            return (
                queryset.join(
                    ProviderInstallationUser,
                    ProviderInstallationUser.provider_installation_id == ProviderInstallation.id,
                )
                .where(
                    ProviderInstallationUser.user_id == user_id,
                    ProviderInstallation.provider == provider,
                )
            )
        return [
            item
            for item in queryset
            if getattr(item, "provider", None) == provider
            and any(
                getattr(link, "user_id", None) == user_id
                for link in getattr(item, "user_links", []) or []
            )
        ]


router = APIRouter()
router.include_router(ProviderAccountsView().router)
router.include_router(ProviderInstallationsView().router)
