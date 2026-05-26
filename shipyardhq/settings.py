"""Django settings loaded through a NetBox-style local configuration module."""

from __future__ import annotations

import importlib
import os
import platform
import sys
from base64 import urlsafe_b64decode
from binascii import Error as BinasciiError
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

if sys.version_info < (3, 12):  # noqa: UP036
    raise RuntimeError(
        f"Shipyard HQ requires Python 3.12 or later. Currently installed: Python {platform.python_version()}."
    )


def _trailing_slash(value: str) -> str:
    value = str(value or "").strip("/")
    return f"{value}/" if value else ""


def _clerk_frontend_api_url(publishable_key: str) -> str:
    if not publishable_key:
        return ""

    try:
        encoded = publishable_key.split("_", 2)[2]
    except IndexError:
        return ""

    padding = "=" * (-len(encoded) % 4)
    try:
        return urlsafe_b64decode(f"{encoded}{padding}").decode().rstrip("$")
    except (BinasciiError, UnicodeDecodeError):
        return ""


config_path = os.getenv("SHIPYARDHQ_CONFIGURATION", "shipyardhq.configuration")

try:
    configuration = importlib.import_module(config_path)
except ModuleNotFoundError as exc:
    if exc.name == config_path:
        raise ImproperlyConfigured(
            f"Specified configuration module ({config_path}) was not found. "
            "Define shipyardhq/configuration.py or set SHIPYARDHQ_CONFIGURATION to another dotted module path."
        ) from exc
    raise

for parameter in ("ALLOWED_HOSTS", "SECRET_KEY", "REDIS"):
    if not hasattr(configuration, parameter):
        raise ImproperlyConfigured(f"Required parameter {parameter} is missing from configuration.")

if not hasattr(configuration, "DATABASE") and not hasattr(configuration, "DATABASES"):
    raise ImproperlyConfigured("Database configuration must be defined using DATABASE or DATABASES.")
if hasattr(configuration, "DATABASE") and hasattr(configuration, "DATABASES"):
    raise ImproperlyConfigured("DATABASE and DATABASES may not both be set. Use DATABASES for new deployments.")


ADMINS = getattr(configuration, "ADMINS", [])
ALLOWED_HOSTS = configuration.ALLOWED_HOSTS
AUTH_PASSWORD_VALIDATORS = getattr(
    configuration,
    "AUTH_PASSWORD_VALIDATORS",
    [
        {
            "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
            "OPTIONS": {"min_length": 12},
        },
        {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
        {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    ],
)
AUTHENTICATION_BACKENDS = ["accounts.backends.ClerkOnlyBackend"]
BASE_PATH = _trailing_slash(getattr(configuration, "BASE_PATH", ""))
CSRF_COOKIE_NAME = getattr(configuration, "CSRF_COOKIE_NAME", "csrftoken")
CSRF_COOKIE_PATH = f"/{BASE_PATH.rstrip('/')}" or "/"
CSRF_COOKIE_SECURE = getattr(configuration, "CSRF_COOKIE_SECURE", False)
CSRF_TRUSTED_ORIGINS = getattr(configuration, "CSRF_TRUSTED_ORIGINS", [])
CLERK_AUTHORIZED_PARTIES = getattr(configuration, "CLERK_AUTHORIZED_PARTIES", [])
CLERK_JWT_KEY = getattr(configuration, "CLERK_JWT_KEY", os.getenv("CLERK_JWT_KEY", ""))
CLERK_PUBLISHABLE_KEY = getattr(
    configuration,
    "CLERK_PUBLISHABLE_KEY",
    os.getenv("CLERK_PUBLISHABLE_KEY", os.getenv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "")),
)
CLERK_SECRET_KEY = getattr(configuration, "CLERK_SECRET_KEY", os.getenv("CLERK_SECRET_KEY", ""))
CLERK_FRONTEND_API_URL = getattr(configuration, "CLERK_FRONTEND_API_URL", "") or _clerk_frontend_api_url(
    CLERK_PUBLISHABLE_KEY
)
CLERK_FRONTEND_API_URL = str(CLERK_FRONTEND_API_URL).removeprefix("https://").removeprefix("http://").strip("/")
DATABASES = getattr(configuration, "DATABASES", {"default": getattr(configuration, "DATABASE", None)})
DEBUG = getattr(configuration, "DEBUG", False)
EMAIL = getattr(configuration, "EMAIL", {})
INTERNAL_IPS = getattr(configuration, "INTERNAL_IPS", ("127.0.0.1", "::1"))
LANGUAGE_CODE = getattr(configuration, "DEFAULT_LANGUAGE", "en-us")
LOGIN_PERSISTENCE = getattr(configuration, "LOGIN_PERSISTENCE", False)
LOGIN_TIMEOUT = getattr(configuration, "LOGIN_TIMEOUT", None)
LOGOUT_REDIRECT_URL = getattr(configuration, "LOGOUT_REDIRECT_URL", "home")
MEDIA_ROOT = getattr(configuration, "MEDIA_ROOT", BASE_DIR / "media")
METRICS_ENABLED = getattr(configuration, "METRICS_ENABLED", False)
PLUGINS = getattr(configuration, "PLUGINS", [])
PLUGINS_CONFIG = getattr(configuration, "PLUGINS_CONFIG", {})
REDIS = configuration.REDIS
RQ_DEFAULT_TIMEOUT = getattr(configuration, "RQ_DEFAULT_TIMEOUT", 300)
SECRET_KEY = configuration.SECRET_KEY
SECURE_HSTS_INCLUDE_SUBDOMAINS = getattr(configuration, "SECURE_HSTS_INCLUDE_SUBDOMAINS", False)
SECURE_HSTS_PRELOAD = getattr(configuration, "SECURE_HSTS_PRELOAD", False)
SECURE_HSTS_SECONDS = getattr(configuration, "SECURE_HSTS_SECONDS", 0)
SECURE_SSL_REDIRECT = getattr(configuration, "SECURE_SSL_REDIRECT", False)
SESSION_COOKIE_NAME = getattr(configuration, "SESSION_COOKIE_NAME", "sessionid")
SESSION_COOKIE_PATH = CSRF_COOKIE_PATH
SESSION_COOKIE_SECURE = getattr(configuration, "SESSION_COOKIE_SECURE", False)
SESSION_FILE_PATH = getattr(configuration, "SESSION_FILE_PATH", None)
TIME_ZONE = getattr(configuration, "TIME_ZONE", "UTC")

if not isinstance(SECRET_KEY, str):
    raise ImproperlyConfigured(f"SECRET_KEY must be a string, not {type(SECRET_KEY).__name__}.")
if len(SECRET_KEY) < 50:
    raise ImproperlyConfigured(
        "SECRET_KEY must be at least 50 characters. Generate one with: python generate_secret_key.py"
    )

if "default" not in DATABASES:
    raise ImproperlyConfigured("DATABASES must define a default database.")
if "ENGINE" not in DATABASES["default"]:
    DATABASES["default"]["ENGINE"] = "django.db.backends.postgresql"

for section in ("tasks", "caching"):
    if section not in REDIS:
        raise ImproperlyConfigured(f"REDIS section in configuration.py is missing {section!r}.")

CACHING_REDIS = REDIS["caching"]
CACHING_REDIS_PROTO = "rediss" if CACHING_REDIS.get("SSL", False) else "redis"
CACHING_REDIS_USERNAME = CACHING_REDIS.get("USERNAME", "")
CACHING_REDIS_HOST = CACHING_REDIS.get("HOST", "localhost")
CACHING_REDIS_PORT = CACHING_REDIS.get("PORT", 6379)
CACHING_REDIS_DATABASE = CACHING_REDIS.get("DATABASE", 1)
CACHING_REDIS_PASSWORD = CACHING_REDIS.get("PASSWORD", "")
CACHING_REDIS_USERNAME_HOST = "@".join(filter(None, [CACHING_REDIS_USERNAME, CACHING_REDIS_HOST]))
CACHING_REDIS_URL = CACHING_REDIS.get(
    "URL",
    f"{CACHING_REDIS_PROTO}://{CACHING_REDIS_USERNAME_HOST}:{CACHING_REDIS_PORT}/{CACHING_REDIS_DATABASE}",
)

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": CACHING_REDIS_URL,
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            "PASSWORD": CACHING_REDIS_PASSWORD,
        },
    }
}


def _rq_connection(redis_config: dict) -> dict:
    if redis_config.get("URL"):
        return {"URL": redis_config["URL"]}
    return {
        "HOST": redis_config.get("HOST", "localhost"),
        "PORT": redis_config.get("PORT", 6379),
        "DB": redis_config.get("DATABASE", 0),
        "USERNAME": redis_config.get("USERNAME", ""),
        "PASSWORD": redis_config.get("PASSWORD", ""),
        "SSL": redis_config.get("SSL", False),
    }


RQ_QUEUES = {
    name: {
        **_rq_connection(REDIS["tasks"]),
        "DEFAULT_TIMEOUT": RQ_DEFAULT_TIMEOUT,
    }
    for name in ("high", "default", "low")
}

if LOGIN_TIMEOUT is not None:
    SESSION_COOKIE_AGE = LOGIN_TIMEOUT
SESSION_SAVE_EVERY_REQUEST = bool(LOGIN_PERSISTENCE)
if SESSION_FILE_PATH is not None:
    SESSION_ENGINE = "django.contrib.sessions.backends.file"
    SESSION_FILE_PATH = SESSION_FILE_PATH

EMAIL_HOST = EMAIL.get("SERVER", "localhost")
EMAIL_HOST_USER = EMAIL.get("USERNAME", "")
EMAIL_HOST_PASSWORD = EMAIL.get("PASSWORD", "")
EMAIL_PORT = EMAIL.get("PORT", 25)
EMAIL_USE_SSL = EMAIL.get("USE_SSL", False)
EMAIL_USE_TLS = EMAIL.get("USE_TLS", False)
EMAIL_TIMEOUT = EMAIL.get("TIMEOUT", 10)
SERVER_EMAIL = EMAIL.get("FROM_EMAIL", "")

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.humanize",
    "django.contrib.postgres",
    "django.forms",
    "django_tables2",
    "taggit",
    "django_rq",
    "core",
    "accounts",
    "members",
    "extras",
    "catalog",
    *PLUGINS,
]

MIDDLEWARE = [
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.locale.LocaleMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "accounts.middleware.ClerkAuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "django.middleware.security.SecurityMiddleware",
]

ROOT_URLCONF = "shipyardhq.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "shipyardhq.context_processors.runtime_settings",
            ],
        },
    }
]

FORM_RENDERER = "django.forms.renderers.TemplatesSetting"
WSGI_APPLICATION = "shipyardhq.wsgi.application"
ASGI_APPLICATION = "shipyardhq.asgi.application"
DJANGO_TABLES2_TEMPLATE = "components/tables/table.html"

USE_I18N = True
USE_TZ = True

LOGIN_URL = f"/{BASE_PATH}"
LOGIN_REDIRECT_URL = f"/{BASE_PATH}"

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True
X_FRAME_OPTIONS = "SAMEORIGIN"

STATIC_URL = f"/{BASE_PATH}static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]
MEDIA_URL = f"/{BASE_PATH}media/"

MESSAGE_TAGS = {
    40: "danger",
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "accounts.User"
