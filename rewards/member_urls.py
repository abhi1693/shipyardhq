from django.urls import path

from rewards.views_member import MemberRewardsView

app_name = "member"

urlpatterns = [
    path("rewards", MemberRewardsView.as_view(), name="rewards"),
]
