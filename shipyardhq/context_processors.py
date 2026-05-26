from django.conf import settings


def runtime_settings(_request):
    return {
        "base_path": settings.BASE_PATH,
        "debug": settings.DEBUG,
        "site_name": "Shipyard HQ",
    }
