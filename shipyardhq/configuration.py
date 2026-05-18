import os
from pathlib import Path
from urllib.parse import unquote, urlparse

BASE_DIR = Path(__file__).resolve().parent.parent


def _bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _list(name: str, default: list[str]) -> list[str]:
    raw = os.getenv(name)
    if not raw:
        return default
    return [item.strip() for item in raw.split(",") if item.strip()]


def parse_database_url(value: str) -> dict:
    parsed = urlparse(value)
    scheme = parsed.scheme.lower()
    if scheme not in {"postgres", "postgresql"}:
        raise ValueError(f"Unsupported DATABASE_URL scheme: {scheme}")

    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": unquote(parsed.path.lstrip("/")),
        "USER": unquote(parsed.username or ""),
        "PASSWORD": unquote(parsed.password or ""),
        "HOST": parsed.hostname or "localhost",
        "PORT": parsed.port or 5432,
        "CONN_MAX_AGE": int(os.getenv("DB_CONN_MAX_AGE", "60")),
    }


DEBUG = _bool("DEBUG", True)
SECRET_KEY = os.getenv(
    "SECRET_KEY",
    "shipyardhq-local-development-secret-key-change-me-immediately-1234567890",
)
ALLOWED_HOSTS = _list("ALLOWED_HOSTS", ["localhost", "127.0.0.1"])
TIME_ZONE = os.getenv("TIME_ZONE", "UTC")
LANGUAGE_CODE = os.getenv("LANGUAGE_CODE", "en-us")
SITE_NAME = os.getenv("SITE_NAME", "Shipyard HQ")
SITE_TAGLINE = os.getenv(
    "SITE_TAGLINE",
    "The Product Hunt alternative where builders ship together.",
)
SITE_URL = os.getenv("SITE_URL", "http://localhost:8000").rstrip("/")
LOGIN_REDIRECT_URL = os.getenv("LOGIN_REDIRECT_URL", "/member/overview")
LOGOUT_REDIRECT_URL = os.getenv("LOGOUT_REDIRECT_URL", "/")

DATABASES = {
    "default": parse_database_url(
        os.getenv(
            "DATABASE_URL",
            "postgresql://postgres:postgres@localhost:5432/shipyardhq",
        )
    )
}
