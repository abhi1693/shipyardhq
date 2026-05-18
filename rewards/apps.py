from django.apps import AppConfig


class RewardsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "rewards"

    def ready(self):
        from . import navigation  # noqa: F401
