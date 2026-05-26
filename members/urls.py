from django.urls import path

from . import views

urlpatterns = [
    path("", views.MemberHomeView.as_view(), name="member_home"),
    path("overview/", views.MemberOverviewView.as_view(), name="member_overview"),
    path("dashboard/", views.MemberDashboardRedirectView.as_view(), name="member_dashboard"),
    path("products/", views.MemberProductsView.as_view(), name="member_products"),
    path("products/add/", views.MemberProductAddView.as_view(), name="member_product_add"),
    path("products/<int:pk>/", views.MemberProductDetailView.as_view(), name="member_product"),
    path("products/<int:pk>/edit/", views.MemberProductEditView.as_view(), name="member_product_edit"),
    path("products/<int:pk>/delete/", views.MemberProductDeleteView.as_view(), name="member_product_delete"),
    path("categories/", views.MemberCategoriesView.as_view(), name="member_categories"),
    path("categories/add/", views.MemberCategoryAddView.as_view(), name="member_category_add"),
    path("categories/<int:pk>/", views.MemberCategoryDetailView.as_view(), name="member_category"),
    path("categories/<int:pk>/edit/", views.MemberCategoryEditView.as_view(), name="member_category_edit"),
    path("categories/<int:pk>/delete/", views.MemberCategoryDeleteView.as_view(), name="member_category_delete"),
    path("use-cases/", views.MemberUseCasesView.as_view(), name="member_use_cases"),
    path("use-cases/add/", views.MemberUseCaseAddView.as_view(), name="member_use_case_add"),
    path("use-cases/<int:pk>/", views.MemberUseCaseDetailView.as_view(), name="member_use_case"),
    path("use-cases/<int:pk>/edit/", views.MemberUseCaseEditView.as_view(), name="member_use_case_edit"),
    path("use-cases/<int:pk>/delete/", views.MemberUseCaseDeleteView.as_view(), name="member_use_case_delete"),
    path("users/", views.MemberUsersView.as_view(), name="member_users"),
    path("users/<int:pk>/", views.MemberUserDetailView.as_view(), name="member_user"),
    path("users/<int:pk>/edit/", views.MemberUserEditView.as_view(), name="member_user_edit"),
    path("users/<int:pk>/delete/", views.MemberUserDeleteView.as_view(), name="member_user_delete"),
    path("launch/", views.MemberLaunchView.as_view(), name="member_launch"),
    path("profile/", views.MemberProfileView.as_view(), name="member_profile"),
]
