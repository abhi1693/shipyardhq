from django.urls import path

from accounts.views import MemberOnboardingView, MemberProfileView
from core.views import NamespaceRootRedirectView

app_name = "member"

urlpatterns = [
    path("", NamespaceRootRedirectView.as_view(target_view_name="member:overview"), name="home"),
    path("onboarding", MemberOnboardingView.as_view(), name="onboarding"),
    path("account/profile", MemberProfileView.as_view(), name="account-profile"),
]
