from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from sqlalchemy import delete, func
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession as Session

from models import (
    ActivityFactDaily,
    ActivityItem,
    LeaderboardEntryRecord,
    Provider,
    ProviderAccount,
    ProviderInstallation,
    ProviderInstallationUser,
    ProviderStatus,
    RepoSyncCursor,
    Repository,
    ScoreSnapshot,
    SyncRun,
)
from services.github_app import list_organization_members
from services.installations import (
    get_provider_installation_user_ids,
    link_provider_installation_users,
    upsert_provider_installation,
)
from services.logger import AppLogger

logger = AppLogger.get_logger(__name__)


@dataclass(frozen=True)
class GithubInstallationEvent:
    event_type: str
    action: str | None
    installation_id: str
    account_login: str
    account_type: str
    permissions: dict | None
    account_id: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "event_type": self.event_type,
            "action": self.action,
            "installation_id": self.installation_id,
            "account_login": self.account_login,
            "account_type": self.account_type,
            "permissions": self.permissions,
            "account_id": self.account_id,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "GithubInstallationEvent":
        return cls(
            event_type=str(data.get("event_type", "")),
            action=data.get("action"),
            installation_id=str(data.get("installation_id", "")),
            account_login=str(data.get("account_login", "")),
            account_type=str(data.get("account_type", "")),
            permissions=data.get("permissions"),
            account_id=data.get("account_id"),
        )


def build_installation_event(
    event_type: str,
    action: str | None,
    payload: dict[str, Any],
) -> GithubInstallationEvent:
    installation = payload.get("installation")
    if not isinstance(installation, dict):
        raise ValueError("Missing installation payload.")
    installation_id = installation.get("id")
    if installation_id is None:
        raise ValueError("Missing installation id.")
    account = installation.get("account") or {}
    if not isinstance(account, dict):
        account = {}
    account_login = account.get("login") or ""
    account_id = account.get("id")
    account_type = account.get("type") or "User"
    permissions = installation.get("permissions")
    return GithubInstallationEvent(
        event_type=event_type,
        action=action,
        installation_id=str(installation_id),
        account_login=account_login,
        account_type=account_type,
        permissions=permissions,
        account_id=str(account_id) if account_id is not None else None,
    )


async def _resolve_user_id(
    session: Session,
    account_login: str,
    account_id: str | None,
) -> int | None:
    if account_login:
        statement = select(ProviderAccount.user_id).where(
            ProviderAccount.provider == Provider.GITHUB,
            func.lower(ProviderAccount.provider_username) == account_login.lower(),
        )
        resolved = (await session.exec(statement)).first()
        if resolved:
            if isinstance(resolved, tuple):
                resolved = resolved[0]
            return int(resolved)

    if account_id:
        statement = select(ProviderAccount.user_id).where(
            ProviderAccount.provider == Provider.GITHUB,
            ProviderAccount.provider_user_id == account_id,
        )
        resolved = (await session.exec(statement)).first()
        if resolved:
            if isinstance(resolved, tuple):
                resolved = resolved[0]
            return int(resolved)

    if account_login:
        statement = select(ProviderAccount.user_id).where(
            ProviderAccount.provider == Provider.GITHUB,
            ProviderAccount.provider_user_id == account_login,
        )
        resolved = (await session.exec(statement)).first()
        if resolved:
            if isinstance(resolved, tuple):
                resolved = resolved[0]
            return int(resolved)
    return None


def _count_rows(result) -> int:
    rowcount = getattr(result, "rowcount", None)
    return int(rowcount or 0)


async def purge_installation_data(
    session: Session,
    installation: ProviderInstallation,
    user_ids: list[int],
) -> dict[str, int]:
    installation_pk = installation.id
    if not user_ids:
        counts = {
            "sync_runs": 0,
            "activity_items": 0,
            "activity_facts": 0,
            "repo_sync_cursors": 0,
            "repositories": _count_rows(
                await session.exec(
                    delete(Repository).where(
                        Repository.installation_id == installation_pk
                    )
                )
            ),
            "score_snapshots": 0,
            "leaderboard_entries": 0,
        }
        return counts

    counts = {
        "sync_runs": _count_rows(
            await session.exec(
                delete(SyncRun).where(
                    SyncRun.provider == Provider.GITHUB,
                    SyncRun.user_id.in_(user_ids),
                )
            )
        ),
        "activity_items": _count_rows(
            await session.exec(
                delete(ActivityItem).where(
                    ActivityItem.provider == Provider.GITHUB,
                    ActivityItem.user_id.in_(user_ids),
                )
            )
        ),
        "activity_facts": _count_rows(
            await session.exec(
                delete(ActivityFactDaily).where(
                    ActivityFactDaily.provider == Provider.GITHUB,
                    ActivityFactDaily.user_id.in_(user_ids),
                )
            )
        ),
        "repo_sync_cursors": _count_rows(
            await session.exec(
                delete(RepoSyncCursor).where(
                    RepoSyncCursor.provider == Provider.GITHUB,
                    RepoSyncCursor.user_id.in_(user_ids),
                )
            )
        ),
        "repositories": _count_rows(
            await session.exec(
                delete(Repository).where(Repository.installation_id == installation_pk)
            )
        ),
        "score_snapshots": _count_rows(
            await session.exec(
                delete(ScoreSnapshot).where(ScoreSnapshot.user_id.in_(user_ids))
            )
        ),
        "leaderboard_entries": _count_rows(
            await session.exec(
                delete(LeaderboardEntryRecord).where(
                    LeaderboardEntryRecord.user_id.in_(user_ids)
                )
            )
        ),
    }
    return counts


def _chunked(values: list[str], chunk_size: int = 500) -> list[list[str]]:
    return [values[index : index + chunk_size] for index in range(0, len(values), chunk_size)]


async def _resolve_user_ids_for_logins(
    session: Session,
    logins: list[str],
) -> list[int]:
    normalized = [login.strip().lower() for login in logins if login.strip()]
    if not normalized:
        return []

    user_ids: set[int] = set()
    for chunk in _chunked(normalized):
        statement = select(ProviderAccount.user_id).where(
            ProviderAccount.provider == Provider.GITHUB,
            ProviderAccount.status == ProviderStatus.ACTIVE,
            func.lower(ProviderAccount.provider_username).in_(chunk),
        )
        results = (await session.exec(statement)).all()
        for item in results:
            resolved = item[0] if isinstance(item, tuple) else item
            if resolved is not None:
                user_ids.add(int(resolved))
    return sorted(user_ids)


async def process_installation_event(
    session: Session,
    event: GithubInstallationEvent,
) -> tuple[bool, str, str | None, list[int]]:
    if event.event_type == "installation" and event.action == "deleted":
        record = (await session.exec(
            select(ProviderInstallation).where(
                ProviderInstallation.provider == Provider.GITHUB,
                ProviderInstallation.installation_id == event.installation_id,
            )
        )).first()
        if record:
            user_ids = await get_provider_installation_user_ids(session, record.id)
            counts = await purge_installation_data(session, record, user_ids)
            await session.exec(
                delete(ProviderInstallationUser).where(
                    ProviderInstallationUser.provider_installation_id == record.id
                )
            )
            await session.delete(record)
            await session.commit()
            summary = " ".join(
                f"{key}={value}" for key, value in sorted(counts.items())
            )
            logger.info(
                "GitHub installation data purged installation_id=%s user_id=%s %s",
                record.installation_id,
                ",".join(str(user_id) for user_id in user_ids) if user_ids else None,
                summary,
                extra={
                    "installation_id": record.installation_id,
                    "user_id": user_ids,
                    **counts,
                },
            )
            return True, "deleted", None, user_ids
        return True, "ignored", "Installation not found.", []

    resolved_user_id = None
    if event.account_type == "User":
        resolved_user_id = await _resolve_user_id(
            session, event.account_login, event.account_id
        )
        if not resolved_user_id:
            return False, "unlinked", "No matching user found for installation account.", []

    existing = (await session.exec(
        select(ProviderInstallation).where(
            ProviderInstallation.provider == Provider.GITHUB,
            ProviderInstallation.installation_id == event.installation_id,
        )
    )).first()

    record = await upsert_provider_installation(
        session,
        provider=Provider.GITHUB,
        installation_id=event.installation_id,
        owner_user_id=resolved_user_id,
        account_login=event.account_login,
        account_type=event.account_type,
        permissions=event.permissions,
        existing=existing,
    )

    linked_user_ids: list[int] = []
    message: str | None = None

    if resolved_user_id:
        await link_provider_installation_users(session, record, [resolved_user_id])
        linked_user_ids = [resolved_user_id]
    else:
        org_members = await list_organization_members(
            event.installation_id, event.account_login
        )
        member_user_ids = await _resolve_user_ids_for_logins(session, org_members)
        if not member_user_ids:
            message = "No matching org members found for installation account."
        else:
            await link_provider_installation_users(session, record, member_user_ids)
            linked_user_ids = member_user_ids
            if record.user_id is None:
                record.user_id = member_user_ids[0]
                session.add(record)
                await session.commit()

    logger.info(
        "GitHub installation linked",
        extra={
            "installation_id": record.installation_id,
            "user_id": linked_user_ids,
            "account_login": record.account_login,
        },
    )
    return True, "linked", message, linked_user_ids
