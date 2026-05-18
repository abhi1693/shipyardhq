from django.urls import path

from accounts.views import (
    AdminProfileView,
    AdminUserCreateView,
    AdminUserDeleteView,
    AdminUserDetailView,
    AdminUserListView,
    AdminUserUpdateView,
)

app_name = "admin"

urlpatterns = [
    path("account/profile", AdminProfileView.as_view(), name="account-profile"),
    path("users", AdminUserListView.as_view(), name="users"),
    path("users/add", AdminUserCreateView.as_view(), name="user-add"),
    path("users/<int:pk>", AdminUserDetailView.as_view(), name="user-detail"),
    path("users/<int:pk>/edit", AdminUserUpdateView.as_view(), name="user-edit"),
    path("users/<int:pk>/delete", AdminUserDeleteView.as_view(), name="user-delete"),
]
