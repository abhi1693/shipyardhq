"""Example local configuration.

Copy this file to shipyardhq/configuration.py and edit values for your environment.
The settings module imports this file by dotted path, the same deployment pattern
used by NetBox.
"""

#########################
# Required settings
#########################

ALLOWED_HOSTS = []

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "shipyardhq",
        "USER": "shipyardhq",
        "PASSWORD": "",
        "HOST": "localhost",
        "PORT": "",
        "CONN_MAX_AGE": 300,
    }
}

REDIS = {
    "tasks": {
        "HOST": "localhost",
        "PORT": 6379,
        "USERNAME": "",
        "PASSWORD": "",
        "DATABASE": 0,
        "SSL": False,
    },
    "caching": {
        "HOST": "localhost",
        "PORT": 6379,
        "USERNAME": "",
        "PASSWORD": "",
        "DATABASE": 1,
        "SSL": False,
    },
}

SECRET_KEY = ""

#########################
# Optional settings
#########################

ADMINS = []
BASE_PATH = ""
CSRF_COOKIE_NAME = "csrftoken"
CSRF_COOKIE_SECURE = False
CSRF_TRUSTED_ORIGINS = []
CLERK_AUTHORIZED_PARTIES = []
CLERK_FRONTEND_API_URL = ""
CLERK_JWT_KEY = ""
CLERK_PUBLISHABLE_KEY = ""
CLERK_SECRET_KEY = ""
DEBUG = False
DEFAULT_LANGUAGE = "en-us"
EMAIL = {
    "SERVER": "localhost",
    "PORT": 25,
    "USERNAME": "",
    "PASSWORD": "",
    "USE_SSL": False,
    "USE_TLS": False,
    "TIMEOUT": 10,
    "FROM_EMAIL": "",
}
INTERNAL_IPS = ("127.0.0.1", "::1")
LOGIN_PERSISTENCE = False
LOGIN_TIMEOUT = None
LOGOUT_REDIRECT_URL = "home"
MEDIA_ROOT = ""
METRICS_ENABLED = False
OPENAI_API_KEY = ""
OPENAI_AUTOFILL_MODEL = "gpt-4o-mini"
PLUGINS = []
PLUGINS_CONFIG = {}
R2 = {
    "ACCESS_KEY_ID": "",
    "SECRET_ACCESS_KEY": "",
    "BUCKET": "",
    "ENDPOINT": "",
    "PUBLIC_BASE_URL": "",
}
RQ_DEFAULT_TIMEOUT = 300
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False
SECURE_HSTS_SECONDS = 0
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_NAME = "sessionid"
SESSION_COOKIE_SECURE = False
SESSION_FILE_PATH = None
TIME_ZONE = "UTC"
