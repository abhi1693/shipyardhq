from django.conf import settings
from django.urls import include, path

from core import views

_patterns = [
    path("", views.HomeView.as_view(), name="home"),
    path("", include("core.urls")),
]

urlpatterns = [
    path(settings.BASE_PATH, include(_patterns)),
]

handler404 = "core.views.handler_404"
handler500 = "core.views.handler_500"
