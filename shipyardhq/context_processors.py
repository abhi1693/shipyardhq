from django.conf import settings


def runtime_settings(_request):
    return {
        "base_path": settings.BASE_PATH,
        "clerk": {
            "frontend_api_url": settings.CLERK_FRONTEND_API_URL,
            "publishable_key": settings.CLERK_PUBLISHABLE_KEY,
        },
        "debug": settings.DEBUG,
        "site_name": "Shipyard HQ",
    }
