from django.urls import include, path

from accounts.views import (
    RegisterView,
    ShipyardLoginView,
    ShipyardLogoutView,
    ShipyardSuspendedView,
)
from analytics.views_admin import AdminOverviewView
from api.views import ApiIndexView
from catalog.views_member import MemberOverviewView
from core.views import PlainTextView

urlpatterns = [
    path("login", ShipyardLoginView.as_view(), name="login"),
    path("logout", ShipyardLogoutView.as_view(), name="logout"),
    path("register", RegisterView.as_view(), name="register"),
    path("auth/suspended", ShipyardSuspendedView.as_view(), name="suspended"),
    path(
        "robots.txt",
        PlainTextView.as_view(body="User-agent: *\nAllow: /\nSitemap: /sitemap.xml\n"),
        name="robots-txt",
    ),
    path(
        "llms.txt",
        PlainTextView.as_view(
            body=(
                "# Shipyard HQ\n"
                "Shipyard HQ runs on Django with product-centric public, "
                "member, admin, and API surfaces.\n"
            )
        ),
        name="llms-txt",
    ),
    path("api", ApiIndexView.as_view(), name="api-root"),
    path("api/", include(("shipyardhq.api_urls", "api"), namespace="api")),
    path("member", MemberOverviewView.as_view(), name="member-root"),
    path("member/", include(("shipyardhq.member_urls", "member"), namespace="member")),
    path("admin", AdminOverviewView.as_view(), name="admin-root"),
    path("admin/", include(("shipyardhq.admin_urls", "admin"), namespace="admin")),
    path("", include(("shipyardhq.public_urls", "public"), namespace="public")),
]
