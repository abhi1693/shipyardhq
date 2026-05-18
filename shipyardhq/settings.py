import importlib
import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

config_path = os.getenv("SHIPYARDHQ_CONFIGURATION", "shipyardhq.configuration")
try:
    configuration = importlib.import_module(config_path)
except ModuleNotFoundError as exc:
    if getattr(exc, "name") == config_path:
        raise ImproperlyConfigured(f"Configuration module '{config_path}' was not found.") from exc
    raise


DEBUG = getattr(configuration, "DEBUG", False)
SECRET_KEY = getattr(configuration, "SECRET_KEY", None)
ALLOWED_HOSTS = getattr(configuration, "ALLOWED_HOSTS", None)
DATABASES = getattr(configuration, "DATABASES", None)
TIME_ZONE = getattr(configuration, "TIME_ZONE", "UTC")
LANGUAGE_CODE = getattr(configuration, "LANGUAGE_CODE", "en-us")
LOGIN_REDIRECT_URL = getattr(configuration, "LOGIN_REDIRECT_URL", "/member/overview")
LOGOUT_REDIRECT_URL = getattr(configuration, "LOGOUT_REDIRECT_URL", "/")

if not SECRET_KEY:
    raise ImproperlyConfigured("SECRET_KEY must be configured.")
if not ALLOWED_HOSTS:
    raise ImproperlyConfigured("ALLOWED_HOSTS must be configured.")
if not DATABASES:
    raise ImproperlyConfigured("DATABASES must be configured.")


INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "core.apps.CoreConfig",
    "accounts.apps.AccountsConfig",
    "catalog.apps.CatalogConfig",
    "billing.apps.BillingConfig",
    "analytics.apps.AnalyticsConfig",
    "rewards.apps.RewardsConfig",
    "events.apps.EventsConfig",
    "api.apps.ApiConfig",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "core.middleware.RequestTrackingMiddleware",
]

ROOT_URLCONF = "shipyardhq.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "core.context_processors.app_shell",
            ],
        },
    }
]

WSGI_APPLICATION = "shipyardhq.wsgi.application"
ASGI_APPLICATION = "shipyardhq.asgi.application"

AUTH_USER_MODEL = "accounts.User"
AUTHENTICATION_BACKENDS = [
    "accounts.backends.EmailOrUsernameBackend",
    "django.contrib.auth.backends.ModelBackend",
]

USE_I18N = True
USE_TZ = True
APPEND_SLASH = False

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
LOGIN_URL = "login"
