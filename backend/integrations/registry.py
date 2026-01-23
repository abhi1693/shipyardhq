from __future__ import annotations

from fastapi import HTTPException

from integrations.base import BaseProviderAdapter
from integrations.github import GitHubAdapter
from models import Provider

ADAPTERS: dict[str, BaseProviderAdapter] = {
    Provider.GITHUB.value.lower(): GitHubAdapter(),
}


def get_provider_adapter(provider: str | Provider) -> BaseProviderAdapter:
    key = provider.value.lower() if isinstance(provider, Provider) else provider.lower()
    adapter = ADAPTERS.get(key)
    if not adapter:
        raise HTTPException(status_code=404, detail="Provider not supported.")
    return adapter
