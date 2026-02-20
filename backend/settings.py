from functools import lru_cache
from typing import Any

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/shipyardhq"
    auto_migrate_db: bool = False
    db_pool_size: int = 5
    db_max_overflow: int = 2
    db_pool_timeout_seconds: int = 30
    db_pool_recycle_seconds: int = 1800
    db_pool_pre_ping: bool = True
    redis_url: str  = "redis://localhost:6379/0"
    redis_cache_default_ttl_seconds: int = 300
    clerk_jwks_url: str | None = None
    clerk_publishable_key: str | None = None
    clerk_js_url: str | None = None
    clerk_verify_iat: bool = True
    clerk_leeway: int = 0
    clerk_secret_key: str | None = None
    identity_webhook_secret: str | None = None
    identity_webhook_tolerance_seconds: int = 300
    admin_base_url: str = "/admin"
    admin_title: str = "ShipyardHQ Admin"
    admin_redirect_url: str | None = None
    analytics_sync_interval_seconds: int = 86400
    rewards_placements_interval_seconds: int = 300
    rewards_backlinks_interval_seconds: int = 86400
    rewards_streak_interval_seconds: int = 86400
    leaderboard_refresh_interval_seconds: int = 3600
    rq_job_result_ttl_seconds: int = 3600
    rq_job_failure_ttl_seconds: int = 604800
    rq_job_ttl_seconds: int = 86400
    rq_registry_cleanup_interval_seconds: int = 3600
    task_worker_lease_seconds: int = 3600
    cors_origins: list[str] | str | None = Field(default_factory=list)
    log_level: str = "INFO"
    log_format: str = "json"
    log_use_utc: bool = True
    rate_limit_enabled: bool = True
    rate_limit_public_requests: int = 120
    rate_limit_public_window_seconds: int = 60
    rate_limit_public_path_requests: int = 60
    rate_limit_public_path_window_seconds: int = 60
    rate_limit_webhook_requests: int = 300
    rate_limit_webhook_window_seconds: int = 60
    rate_limit_webhook_path_requests: int = 120
    rate_limit_webhook_path_window_seconds: int = 60
    rate_limit_use_forwarded_for: bool = False
    rate_limit_ip_header: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: Any) -> Any:
        def normalize_items(items: list[Any] | tuple[Any, ...] | set[Any]) -> list[str]:
            normalized: list[str] = []
            for item in items:
                if item is None:
                    continue
                item_str = str(item).strip()
                if (
                    len(item_str) >= 2
                    and item_str[0] == item_str[-1]
                    and item_str[0] in {"'", '"'}
                ):
                    item_str = item_str[1:-1].strip()
                if item_str:
                    normalized.append(item_str)
            return normalized

        if value is None:
            return []
        if isinstance(value, str):
            trimmed = value.strip()
            if not trimmed:
                return []
            if (
                len(trimmed) >= 2
                and trimmed[0] == trimmed[-1]
                and trimmed[0] in {"'", '"'}
            ):
                trimmed = trimmed[1:-1].strip()
            if not trimmed:
                return []
            return normalize_items(trimmed.split(","))
        if isinstance(value, (list, tuple, set)):
            return normalize_items(value)
        return value

    @field_validator(
        "auto_migrate_db",
        "db_pool_pre_ping",
        "clerk_verify_iat",
        "log_use_utc",
        "rate_limit_enabled",
        "rate_limit_use_forwarded_for",
        mode="before",
    )
    @classmethod
    def normalize_bool_env(cls, value: Any) -> Any:
        if isinstance(value, str):
            trimmed = value.strip()
            if (
                len(trimmed) >= 2
                and trimmed[0] == trimmed[-1]
                and trimmed[0] in {"'", '"'}
            ):
                return trimmed[1:-1].strip()
            return trimmed
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
