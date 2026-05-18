from core.navigation import build_navigation
from shipyardhq import configuration


def app_shell(request):
    return {
        "shipyard_ui": {
            "app_name": configuration.SITE_NAME,
            "tagline": configuration.SITE_TAGLINE,
            "site_url": configuration.SITE_URL,
        },
        "navigation_items": build_navigation(request),
    }
