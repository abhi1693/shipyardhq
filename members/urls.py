from django.urls import path

from . import views

urlpatterns = [
    path("", views.MemberHomeView.as_view(), name="member_home"),
    path("overview/", views.MemberOverviewView.as_view(), name="member_overview"),
    path("dashboard/", views.MemberDashboardRedirectView.as_view(), name="member_dashboard"),
    path("products/", views.MemberProductsView.as_view(), name="member_products"),
    path("users/", views.MemberUsersView.as_view(), name="member_users"),
    path("launch/", views.MemberLaunchView.as_view(), name="member_launch"),
    path("profile/", views.MemberProfileView.as_view(), name="member_profile"),
]
