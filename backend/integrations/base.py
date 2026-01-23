from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass

from fastapi import Request
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession as Session

from models import Provider, ProviderAccount, ProviderInstallation
from services.installations import (
    link_provider_installation_users,
    upsert_provider_installation,
)
from services.schemas.core import ClerkProfile
from services.schemas.providers import ProviderInstallCallbackResponse
from services.users import get_or_create_user_by_clerk_id


@dataclass
class ProviderSyncResult:
    ok: bool
    error: str | None
    repos: int
    items: int
    facts: int
    last_synced_at: str | None = None
    warnings: list[str] | None = None
    sync_run_id: int | None = None

    def to_dict(self) -> dict[str, object]:
        return {
            "ok": self.ok,
            "error": self.error,
            "repos": self.repos,
            "items": self.items,
            "facts": self.facts,
            "last_synced_at": self.last_synced_at,
            "warnings": self.warnings,
            "sync_run_id": self.sync_run_id,
        }


class BaseProviderAdapter(ABC):
    provider: Provider
    install_param: str = "installation_id"
    @abstractmethod
    async def sync(
        self,
        session: Session,
        clerk_id: str,
        clerk_user: ClerkProfile | None,
        installation_id: str | None = None,
    ) -> ProviderSyncResult:
        raise NotImplementedError

    @abstractmethod
    async def fetch_installation(self, installation_id: str) -> dict:
        raise NotImplementedError

    def parse_installation(self, installation: dict) -> tuple[str, str, dict | None]:
        account = installation.get("account") or {}
        account_login = account.get("login") or "unknown"
        account_type = account.get("type") or "User"
        permissions = installation.get("permissions")
        return account_login, account_type, permissions

    def get_install_url(self) -> str | None:
        return None

    async def handle_install_callback(
        self,
        request: Request,
        session: Session,
        user_id: str | None,
    ) -> ProviderInstallCallbackResponse:
        installation_id = request.query_params.get(self.install_param)
        if not installation_id:
            return self._build_callback_response(
                ok=False,
                status="missing_installation_id",
                message="Installation id is required.",
                installation_id=None,
            )

        installation = await self.fetch_installation(str(installation_id))
        account_login, account_type, permissions = self.parse_installation(installation)

        resolved_user_id = await self._resolve_install_user_id(
            session,
            user_id,
            account_login,
            account_type,
        )
        if not resolved_user_id:
            return self._build_callback_response(
                ok=False,
                status="unlinked",
                message="Installation received but no matching user was found.",
                installation_id=str(installation_id),
            )

        existing = (await session.exec(
            select(ProviderInstallation).where(
                ProviderInstallation.provider == self.provider,
                ProviderInstallation.installation_id == str(installation_id),
            )
        )).first()

        try:
            record = await upsert_provider_installation(
                session,
                provider=self.provider,
                installation_id=str(installation_id),
                owner_user_id=resolved_user_id,
                account_login=account_login,
                account_type=account_type,
                permissions=permissions,
            )
            await link_provider_installation_users(
                session,
                record,
                [resolved_user_id],
            )
        except IntegrityError:
            await session.rollback()
            return self._build_callback_response(
                ok=False,
                status="conflict",
                message="Installation is already linked to another user.",
                installation_id=str(installation_id),
            )

        return self._build_callback_response(
            ok=True,
            status="success",
            message="Installation linked.",
            installation_id=str(installation_id),
        )

    def _build_callback_response(
        self,
        *,
        ok: bool,
        status: str,
        message: str | None,
        installation_id: str | None,
    ) -> ProviderInstallCallbackResponse:
        return ProviderInstallCallbackResponse(
            ok=ok,
            status=status,
            message=message,
            provider=self.provider,
            installation_id=installation_id,
        )

    async def _resolve_install_user_id(
        self,
        session: Session,
        clerk_id: str | None,
        account_login: str,
        account_type: str,
    ) -> int | None:
        if clerk_id:
            db_user = await get_or_create_user_by_clerk_id(session, clerk_id)
            return db_user.id

        if not account_login or account_type != "User":
            return None

        statement = select(ProviderAccount.user_id).where(
            ProviderAccount.provider == self.provider,
            func.lower(ProviderAccount.provider_username) == account_login.lower(),
        )
        resolved = (await session.exec(statement)).first()
        if resolved:
            if isinstance(resolved, tuple):
                resolved = resolved[0]
            return int(resolved)

        statement = select(ProviderAccount.user_id).where(
            ProviderAccount.provider == self.provider,
            ProviderAccount.provider_user_id == account_login,
        )
        resolved = (await session.exec(statement)).first()
        if resolved:
            if isinstance(resolved, tuple):
                resolved = resolved[0]
            return int(resolved)
        return None
