from django.urls import path

from rewards.views_public import PublicRewardsListView

app_name = "public"

urlpatterns = [
    path("rewards", PublicRewardsListView.as_view(), name="rewards"),
]
