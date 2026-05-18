from django.urls import path

from api.views import ApiIndexView

app_name = "api"

urlpatterns = [
    path("", ApiIndexView.as_view(), name="index"),
]
