from django.urls import re_path

from . import views

urlpatterns = [
    re_path(r"^healthz/?$", views.HealthView.as_view(), name="healthz"),
    re_path(r"^webhooks/dodo/?$", views.DodoWebhookView.as_view(), name="dodo_webhook"),
]
