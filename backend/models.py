from datetime import date, datetime, timezone
from enum import Enum
from typing import Any, Optional, Self

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Enum as SAEnum,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.sql import func
from sqlmodel import Field, Relationship, SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession as Session


class Provider(str, Enum):
    GITHUB = "GITHUB"


class ProviderStatus(str, Enum):
    ACTIVE = "ACTIVE"
    DISCONNECTED = "DISCONNECTED"


class TaskStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class UserRole(str, Enum):
    MEMBER = "MEMBER"
    ADMIN = "ADMIN"


PROVIDER_ENUM = SAEnum(Provider, name="provider_enum")
PROVIDER_STATUS_ENUM = SAEnum(ProviderStatus, name="provider_status_enum")
TASK_STATUS_ENUM = SAEnum(TaskStatus, name="task_status_enum")
USER_ROLE_ENUM = SAEnum(UserRole, name="user_role_enum")


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class BaseModel(SQLModel):
    __abstract__ = True

    id: int | None = Field(default=None, primary_key=True)
    created_at: datetime = Field(
        default_factory=utcnow,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"server_default": func.now(), "nullable": False},
    )
    updated_at: datetime = Field(
        default_factory=utcnow,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={
            "server_default": func.now(),
            "onupdate": func.now(),
            "nullable": False,
        },
    )

    def clean(self) -> None:
        return None

    def full_clean(self) -> None:
        self.clean()

    async def save(
        self,
        session: Session,
        *,
        commit: bool = True,
        refresh: bool = True,
    ) -> Self:
        self.full_clean()
        session.add(self)
        if commit:
            await session.commit()
            if refresh:
                await session.refresh(self)
        elif refresh:
            await session.flush()
            await session.refresh(self)
        return self

    async def delete(self, session: Session, *, commit: bool = True) -> None:
        await session.delete(self)
        if commit:
            await session.commit()

    async def update(
        self,
        session: Session,
        *,
        commit: bool = True,
        refresh: bool = True,
        **kwargs: Any,
    ) -> Self:
        for key, value in kwargs.items():
            setattr(self, key, value)
        return await self.save(session, commit=commit, refresh=refresh)

    def __str__(self) -> str:
        return str(self.id)


class User(BaseModel, table=True):
    __tablename__ = "user"
    __table_args__ = (Index("ix_user_handle", "handle"),)

    clerk_id: str = Field(sa_column=Column(String, unique=True, nullable=False))
    handle: str | None = Field(default=None, sa_column=Column(String, unique=True, nullable=True))
    display_name: str | None = Field(default=None, sa_column=Column(String, nullable=True))
    avatar_url: str | None = Field(default=None, sa_column=Column(String, nullable=True))
    role: UserRole = Field(
        default=UserRole.MEMBER,
        sa_column=Column(
            USER_ROLE_ENUM,
            nullable=False,
            server_default=text("'MEMBER'"),
        ),
    )

    provider_accounts: list["ProviderAccount"] = Relationship(
        back_populates="user", cascade_delete=True, passive_deletes=True
    )
    provider_installation_links: list["ProviderInstallationUser"] = Relationship(
        back_populates="user", cascade_delete=True, passive_deletes=True
    )
    activity_items: list["ActivityItem"] = Relationship(
        back_populates="user", cascade_delete=True, passive_deletes=True
    )
    activity_facts: list["ActivityFactDaily"] = Relationship(
        back_populates="user", cascade_delete=True, passive_deletes=True
    )
    score_snapshots: list["ScoreSnapshot"] = Relationship(
        back_populates="user", cascade_delete=True, passive_deletes=True
    )
    settings: Optional["UserSettings"] = Relationship(
        back_populates="user", cascade_delete=True, passive_deletes=True
    )
    leaderboard_entries: list["LeaderboardEntryRecord"] = Relationship(
        back_populates="user", cascade_delete=True, passive_deletes=True
    )
    sync_cursors: list["RepoSyncCursor"] = Relationship(
        back_populates="user", cascade_delete=True, passive_deletes=True
    )
    sync_runs: list["SyncRun"] = Relationship(
        back_populates="user", cascade_delete=True, passive_deletes=True
    )
    tasks: list["Task"] = Relationship(back_populates="user", passive_deletes=True)

    def __str__(self) -> str:
        return self.handle or self.display_name or self.clerk_id or str(self.id)


class ProviderAccount(BaseModel, table=True):
    __tablename__ = "provider_account"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "provider",
            name="uq_provider_account_user_provider",
        ),
        UniqueConstraint(
            "provider",
            "provider_user_id",
            name="uq_provider_account_provider_user_id",
        ),
        Index("ix_provider_account_user_id", "user_id"),
    )

    user_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    provider: Provider = Field(sa_column=Column(PROVIDER_ENUM, nullable=False))
    provider_user_id: str = Field(sa_column=Column(String, nullable=False))
    provider_username: str | None = Field(
        default=None, sa_column=Column(String, nullable=True)
    )
    status: ProviderStatus = Field(
        default=ProviderStatus.ACTIVE,
        sa_column=Column(
            PROVIDER_STATUS_ENUM,
            default=ProviderStatus.ACTIVE,
            nullable=False,
        )
    )
    connected_at: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    )
    last_synced_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True), nullable=True)
    )
    user: User = Relationship(back_populates="provider_accounts")
    activity_items: list["ActivityItem"] = Relationship(back_populates="provider_account")
    activity_fact_dailies: list["ActivityFactDaily"] = Relationship(
        back_populates="provider_account"
    )

    def __str__(self) -> str:
        provider = getattr(self.provider, "value", self.provider)
        identifier = self.provider_username or self.provider_user_id
        return f"{provider}:{identifier}"


class UserSettings(BaseModel, table=True):
    __tablename__ = "user_settings"
    __table_args__ = (
        UniqueConstraint("user_id", name="uq_user_settings_user_id"),
        Index("ix_user_settings_user_id", "user_id"),
        Index("ix_user_settings_country", "country"),
    )

    user_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    profile_public: bool = Field(
        default=True,
        sa_column=Column(Boolean, nullable=False, server_default=text("true")),
    )
    include_in_leaderboard: bool = Field(
        default=True,
        sa_column=Column(Boolean, nullable=False, server_default=text("true")),
    )
    show_repos: bool = Field(
        default=True,
        sa_column=Column(Boolean, nullable=False, server_default=text("true")),
    )
    show_commits: bool = Field(
        default=True,
        sa_column=Column(Boolean, nullable=False, server_default=text("true")),
    )
    country: str | None = Field(
        default=None, sa_column=Column(String, nullable=True)
    )

    user: User = Relationship(back_populates="settings")

    def __str__(self) -> str:
        return f"{self.user_id}:settings"


class ProviderInstallation(BaseModel, table=True):
    __tablename__ = "provider_installation"
    __table_args__ = (
        UniqueConstraint(
            "provider",
            "installation_id",
            name="uq_provider_installation_provider_installation_id",
        ),
        Index("ix_provider_installation_user_id", "user_id"),
    )

    user_id: int | None = Field(
        sa_column=Column(
            Integer,
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        )
    )
    provider: Provider = Field(sa_column=Column(PROVIDER_ENUM, nullable=False))
    installation_id: str = Field(sa_column=Column(String, nullable=False))
    account_login: str = Field(sa_column=Column(String, nullable=False))
    account_type: str = Field(sa_column=Column(String, nullable=False))
    permissions: dict[str, Any] | None = Field(
        default=None, sa_column=Column(JSON, nullable=True)
    )
    last_synced_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True), nullable=True)
    )
    user_links: list["ProviderInstallationUser"] = Relationship(
        back_populates="provider_installation",
        cascade_delete=True,
        passive_deletes=True,
    )
    repositories: list["Repository"] = Relationship(back_populates="installation")
    sync_runs: list["SyncRun"] = Relationship(back_populates="provider_installation")

    def __str__(self) -> str:
        provider = getattr(self.provider, "value", self.provider)
        return f"{provider}:{self.installation_id}"


class ProviderInstallationUser(BaseModel, table=True):
    __tablename__ = "provider_installation_user"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "provider_installation_id",
            name="uq_provider_installation_user",
        ),
        Index("ix_provider_installation_user_user_id", "user_id"),
        Index(
            "ix_provider_installation_user_installation_id",
            "provider_installation_id",
        ),
    )

    user_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    provider_installation_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("provider_installation.id", ondelete="CASCADE"),
            nullable=False,
        )
    )

    user: User = Relationship(back_populates="provider_installation_links")
    provider_installation: ProviderInstallation = Relationship(
        back_populates="user_links"
    )

    def __str__(self) -> str:
        return f"{self.user_id}:{self.provider_installation_id}"


class Repository(BaseModel, table=True):
    __tablename__ = "repository"
    __table_args__ = (
        UniqueConstraint(
            "provider",
            "provider_repo_id",
            name="uq_repository_provider_repo_id",
        ),
        Index("ix_repository_full_name", "full_name"),
        Index("ix_repository_owner_login", "owner_login"),
        Index("ix_repository_primary_language", "primary_language"),
    )

    provider: Provider = Field(sa_column=Column(PROVIDER_ENUM, nullable=False))
    provider_repo_id: str = Field(sa_column=Column(String, nullable=False))
    full_name: str = Field(sa_column=Column(String, nullable=False))
    name: str = Field(sa_column=Column(String, nullable=False))
    owner_login: str = Field(sa_column=Column(String, nullable=False))
    primary_language: str | None = Field(
        default=None, sa_column=Column(String, nullable=True)
    )
    is_private: bool = Field(
        default=False,
        sa_column=Column(Boolean, nullable=False, server_default=text("false"))
    )
    default_branch: str | None = Field(
        default=None, sa_column=Column(String, nullable=True)
    )
    archived: bool = Field(
        default=False,
        sa_column=Column(Boolean, nullable=False, server_default=text("false"))
    )
    installation_id: int | None = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("provider_installation.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    installation: ProviderInstallation | None = Relationship(
        back_populates="repositories"
    )
    activity_items: list["ActivityItem"] = Relationship(back_populates="repository")
    sync_cursors: list["RepoSyncCursor"] = Relationship(back_populates="repository")

    def __str__(self) -> str:
        return self.full_name or self.name or str(self.id)


class RepoSyncCursor(BaseModel, table=True):
    __tablename__ = "repo_sync_cursor"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "repository_id",
            "cursor_key",
            name="uq_repo_sync_cursor_user_repo_cursor",
        ),
        Index("ix_repo_sync_cursor_user_cursor", "user_id", "cursor_key"),
    )

    user_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    provider: Provider = Field(sa_column=Column(PROVIDER_ENUM, nullable=False))
    repository_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("repository.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    cursor_key: str = Field(sa_column=Column(String, nullable=False))
    cursor_value: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    user: User = Relationship(back_populates="sync_cursors")
    repository: Repository = Relationship(back_populates="sync_cursors")

    def __str__(self) -> str:
        return f"{self.user_id}:{self.repository_id}:{self.cursor_key}"


class ActivityItem(BaseModel, table=True):
    __tablename__ = "activity_item"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "provider",
            "provider_item_id",
            name="uq_activity_item_user_provider_item",
        ),
        Index("ix_activity_item_user_occurred", "user_id", "occurred_at"),
    )

    user_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    provider: Provider = Field(sa_column=Column(PROVIDER_ENUM, nullable=False))
    provider_account_id: int | None = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("provider_account.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    repository_id: int | None = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("repository.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    provider_item_id: str = Field(sa_column=Column(String, nullable=False))
    type: str = Field(sa_column=Column(String, nullable=False))
    occurred_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    repo_full_name: str | None = Field(
        default=None, sa_column=Column(String, nullable=True)
    )
    title: str | None = Field(default=None, sa_column=Column(String, nullable=True))
    number: int | None = Field(default=None, sa_column=Column(Integer, nullable=True))
    url: str | None = Field(default=None, sa_column=Column(String, nullable=True))
    metadata_: dict[str, Any] | None = Field(
        default=None,
        sa_column=Column("metadata", JSON, nullable=True),
    )
    user: User = Relationship(back_populates="activity_items")
    provider_account: ProviderAccount | None = Relationship(
        back_populates="activity_items"
    )
    repository: Repository | None = Relationship(back_populates="activity_items")

    def __str__(self) -> str:
        provider = getattr(self.provider, "value", self.provider)
        return f"{provider}:{self.type}:{self.provider_item_id}"


class SyncRun(BaseModel, table=True):
    __tablename__ = "sync_run"
    __table_args__ = (
        Index("ix_sync_run_user_started", "user_id", "started_at"),
        Index("ix_sync_run_provider_started", "provider", "started_at"),
    )

    user_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    provider: Provider = Field(sa_column=Column(PROVIDER_ENUM, nullable=False))
    provider_installation_id: int | None = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("provider_installation.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    status: str = Field(sa_column=Column(String, nullable=False))
    started_at: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    )
    finished_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True), nullable=True)
    )
    repos: int = Field(
        default=0,
        sa_column=Column(Integer, nullable=False, server_default=text("0"))
    )
    items: int = Field(
        default=0,
        sa_column=Column(Integer, nullable=False, server_default=text("0"))
    )
    facts: int = Field(
        default=0,
        sa_column=Column(Integer, nullable=False, server_default=text("0"))
    )
    warnings: int = Field(
        default=0,
        sa_column=Column(Integer, nullable=False, server_default=text("0"))
    )
    error: str | None = Field(default=None, sa_column=Column(String, nullable=True))
    user: User = Relationship(back_populates="sync_runs")
    provider_installation: ProviderInstallation | None = Relationship(
        back_populates="sync_runs"
    )

    def __str__(self) -> str:
        provider = getattr(self.provider, "value", self.provider)
        return f"{provider}:{self.status}:{self.id}"


class Task(BaseModel, table=True):
    __tablename__ = "task"
    __table_args__ = (
        UniqueConstraint(
            "task_type",
            "dedupe_key",
            name="uq_task_type_dedupe",
        ),
        Index("ix_task_status_run_after", "status", "run_after"),
        Index("ix_task_locked_until", "locked_until"),
        Index("ix_task_type", "task_type"),
        Index("ix_task_user_id", "user_id"),
    )

    task_type: str = Field(sa_column=Column(String, nullable=False))
    status: TaskStatus = Field(
        default=TaskStatus.PENDING,
        sa_column=Column(TASK_STATUS_ENUM, nullable=False),
    )
    user_id: int | None = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    dedupe_key: str | None = Field(default=None, sa_column=Column(String, nullable=True))
    priority: int = Field(
        default=0,
        sa_column=Column(Integer, nullable=False, server_default=text("0")),
    )
    run_after: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            nullable=False,
        ),
    )
    locked_until: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    locked_by: str | None = Field(default=None, sa_column=Column(String, nullable=True))
    attempts: int = Field(
        default=0,
        sa_column=Column(Integer, nullable=False, server_default=text("0")),
    )
    max_attempts: int = Field(
        default=5,
        sa_column=Column(Integer, nullable=False, server_default=text("5")),
    )
    started_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    finished_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    payload: dict[str, Any] | None = Field(
        default=None,
        sa_column=Column(JSON, nullable=True),
    )
    result: dict[str, Any] | None = Field(
        default=None,
        sa_column=Column(JSON, nullable=True),
    )
    error: str | None = Field(default=None, sa_column=Column(String, nullable=True))

    user: User | None = Relationship(back_populates="tasks")

    def __str__(self) -> str:
        return f"{self.task_type}:{self.status}:{self.id}"


class ActivityFactDaily(BaseModel, table=True):
    __tablename__ = "activity_fact_daily"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "provider",
            "day",
            "metric_key",
            "bucket",
            name="uq_activity_fact_daily_user_provider_day_metric_bucket",
        ),
        Index("ix_activity_fact_daily_user_day", "user_id", "day"),
        Index("ix_activity_fact_daily_provider_metric", "provider", "metric_key"),
    )

    user_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    provider: Provider = Field(sa_column=Column(PROVIDER_ENUM, nullable=False))
    provider_account_id: int | None = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("provider_account.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    day: date = Field(sa_column=Column(Date, nullable=False))
    metric_key: str = Field(sa_column=Column(String, nullable=False))
    value: float = Field(sa_column=Column(Float, nullable=False))
    bucket: str = Field(
        default="global",
        sa_column=Column(String, server_default=text("'global'"), nullable=False),
    )
    metadata_: dict[str, Any] | None = Field(
        default=None,
        sa_column=Column("metadata", JSON, nullable=True),
    )
    user: User = Relationship(back_populates="activity_facts")
    provider_account: ProviderAccount | None = Relationship(
        back_populates="activity_fact_dailies"
    )

    def __str__(self) -> str:
        provider = getattr(self.provider, "value", self.provider)
        day = self.day.isoformat() if self.day else ""
        return f"{provider}:{self.metric_key}:{day}"


class ScoreSnapshot(BaseModel, table=True):
    __tablename__ = "score_snapshot"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "period",
            "period_start",
            "period_end",
            name="uq_score_snapshot_user_period_start_end",
        ),
        Index("ix_score_snapshot_period_start", "period", "period_start"),
        Index("ix_score_snapshot_user_period", "user_id", "period"),
    )

    user_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    period: str = Field(sa_column=Column(String, nullable=False))
    period_start: date = Field(sa_column=Column(Date, nullable=False))
    period_end: date = Field(sa_column=Column(Date, nullable=False))
    total_score: float = Field(sa_column=Column(Float, nullable=False))
    consistency_score: float = Field(sa_column=Column(Float, nullable=False))
    momentum_score: float = Field(sa_column=Column(Float, nullable=False))
    impact_score: float = Field(sa_column=Column(Float, nullable=False))
    metrics: dict[str, Any] | None = Field(
        default=None, sa_column=Column(JSON, nullable=True)
    )
    scoring_version: int = Field(
        default=1,
        sa_column=Column(Integer, nullable=False, server_default=text("1"))
    )
    computed_at: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    )

    user: User = Relationship(back_populates="score_snapshots")

    def __str__(self) -> str:
        start = self.period_start.isoformat() if self.period_start else ""
        return f"{self.user_id}:{self.period}:{start}"


class LeaderboardEntryRecord(BaseModel, table=True):
    __tablename__ = "leaderboard_entry"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "period",
            "period_start",
            "period_end",
            "scope",
            name="uq_leaderboard_entry_user_period_scope",
        ),
        Index(
            "ix_leaderboard_entry_scope_period_rank",
            "scope",
            "period",
            "period_start",
            "rank",
        ),
        Index(
            "ix_leaderboard_entry_scope_period_score",
            "scope",
            "period",
            "period_start",
            "total_score",
        ),
        Index("ix_leaderboard_entry_user_period", "user_id", "period", "period_start"),
    )

    user_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    period: str = Field(sa_column=Column(String, nullable=False))
    period_start: date = Field(sa_column=Column(Date, nullable=False))
    period_end: date = Field(sa_column=Column(Date, nullable=False))
    scope: str = Field(
        default="global",
        sa_column=Column(String, nullable=False, server_default=text("'global'")),
    )
    scope_metadata: dict[str, Any] | None = Field(
        default=None, sa_column=Column(JSON, nullable=True)
    )
    total_score: float = Field(sa_column=Column(Float, nullable=False))
    rank: int = Field(sa_column=Column(Integer, nullable=False))
    score_snapshot_id: int | None = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("score_snapshot.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    computed_at: datetime = Field(
        default_factory=utcnow,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"server_default": func.now(), "nullable": False},
    )

    user: User = Relationship(back_populates="leaderboard_entries")

    def __str__(self) -> str:
        start = self.period_start.isoformat() if self.period_start else ""
        return f"{self.user_id}:{self.period}:{self.scope}:{start}"
