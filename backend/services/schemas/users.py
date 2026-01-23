from __future__ import annotations

from pydantic import Field

from services.schemas.base import BaseSerializer
from services.schemas.providers import ProviderAccountSummary, ProviderInstallationSummary


class UserSettingsResponse(BaseSerializer):
    profile_public: bool = Field(validation_alias="profilePublic")
    include_in_leaderboard: bool = Field(validation_alias="includeInLeaderboard")
    show_repos: bool = Field(validation_alias="showRepos")
    show_commits: bool = Field(validation_alias="showCommits")
    country: str | None = None


class SettingsUpdateRequest(BaseSerializer):
    handle: str | None = None
    profile_public: bool | None = Field(default=None, validation_alias="profilePublic")
    include_in_leaderboard: bool | None = Field(
        default=None, validation_alias="includeInLeaderboard"
    )
    show_repos: bool | None = Field(default=None, validation_alias="showRepos")
    show_commits: bool | None = Field(default=None, validation_alias="showCommits")
    country: str | None = None


class SettingsUpdateResponse(BaseSerializer):
    ok: bool
    error: str | None = None
    settings: UserSettingsResponse | None = None


class HandleAvailabilityResponse(BaseSerializer):
    ok: bool
    handle: str | None = None
    available: bool | None = None
    error: str | None = None


class SettingsSummaryResponse(BaseSerializer):
    ok: bool
    handle: str | None = None
    suggested_handle: str | None = Field(default=None, validation_alias="suggestedHandle")
    settings: UserSettingsResponse | None = None
    provider_accounts: list[ProviderAccountSummary] = Field(
        default_factory=list, validation_alias="providerAccounts"
    )
    provider_installations: list[ProviderInstallationSummary] = Field(
        default_factory=list, validation_alias="providerInstallations"
    )


class ProfileDeleteResponse(BaseSerializer):
    ok: bool
    status: str
    message: str | None = None
