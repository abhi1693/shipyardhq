from __future__ import annotations

from sqlmodel.ext.asyncio.session import AsyncSession as Session

from integrations.base import BaseProviderAdapter, ProviderSyncResult
from models import Provider
from services.github_app import get_github_app_install_url, get_github_installation
from services.github_sync import sync_github_for_clerk_user
from services.schemas.core import ClerkProfile


class GitHubAdapter(BaseProviderAdapter):
    provider = Provider.GITHUB

    async def sync(
        self,
        session: Session,
        clerk_id: str,
        clerk_user: ClerkProfile | None,
        installation_id: str | None = None,
    ) -> ProviderSyncResult:
        result = await sync_github_for_clerk_user(
            session,
            clerk_id,
            clerk_user,
            installation_id=installation_id,
        )
        return ProviderSyncResult(
            ok=result.ok,
            error=result.error,
            repos=result.repos,
            items=result.items,
            facts=result.facts,
            last_synced_at=result.last_synced_at,
            warnings=result.warnings,
            sync_run_id=result.sync_run_id,
        )

    async def fetch_installation(self, installation_id: str) -> dict:
        return await get_github_installation(installation_id)

    def get_install_url(self) -> str | None:
        return get_github_app_install_url()
