from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession as Session

from auth import CurrentUserId
from database import get_session
from integrations.registry import get_provider_adapter
from routers.base import api_prefix
from routers.generics import APIView, NonModelRetrieveAPIView
from services.logger import AppLogger
from services.rate_limit import public_rate_limit
from services.schemas.providers import (
    ProviderAppConfigResponse,
    ProviderSyncRequest,
    ProviderSyncQueuedResponse,
)
from services.sync_scheduler import enqueue_provider_sync

logger = AppLogger.get_logger(__name__)


Action = APIView.Action


def build_provider_app_config(provider: str) -> ProviderAppConfigResponse:
    adapter = get_provider_adapter(provider)
    return ProviderAppConfigResponse(
        provider=adapter.provider,
        install_url=adapter.get_install_url(),
    )


class ProvidersWriteView(APIView):
    actions = (
        Action(
            path="/runs",
            methods=["POST"],
            handler="sync_provider",
            response_model=ProviderSyncQueuedResponse,
            status_code=202,
        ),
    )

    def __init__(self) -> None:
        super().__init__(prefix=api_prefix("providers", "{provider}"), tags=["providers"])

    async def sync_provider(
        self,
        provider: str,
        user_id: CurrentUserId,
        payload: ProviderSyncRequest | None = None,
    ):
        adapter = get_provider_adapter(provider)
        installation_id = payload.installation_id if payload else None
        logger.info(
            "sync queued - %s",
            {
                "provider": provider,
                "user_id": user_id,
                "installation_id": installation_id,
            },
        )
        await enqueue_provider_sync(
            provider,
            user_id,
            installation_id=installation_id,
        )
        return ProviderSyncQueuedResponse(
            ok=True,
            status="queued",
            message="Sync queued.",
            provider=adapter.provider,
        )


class ProviderAppConfigDetailView(NonModelRetrieveAPIView):
    serializer_class = ProviderAppConfigResponse

    def __init__(self) -> None:
        super().__init__(prefix=api_prefix("providers", "{provider}"), tags=["providers"])

    def get_detail_path(self) -> str:
        return "/app"

    async def retrieve(
        self,
        provider: str,
        _: None = Depends(public_rate_limit),
        session: Session = Depends(get_session),
    ):
        return build_provider_app_config(provider)


router = APIRouter()
router.include_router(ProviderAppConfigDetailView().router)
router.include_router(ProvidersWriteView().router)
