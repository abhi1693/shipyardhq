from django.urls import reverse, reverse_lazy

from catalog.models import (
    AlternativeProduct,
    Category,
    MemberFeedback,
    Plan,
    PlanFeature,
    PlanFeatureAssignment,
    Product,
    ProductBadge,
    UseCase,
    UseCaseCategory,
)
from core.generic_views import (
    DashboardView,
    ModelObjectCreateView,
    ModelObjectDeleteView,
    ModelObjectDetailView,
    ModelObjectListView,
    ModelObjectUpdateView,
)
from core.mixins import AdminRequiredMixin


class AdminCatalogMixin(AdminRequiredMixin):
    base_template = "base/private.html"


class AdminNamedListView(AdminCatalogMixin, ModelObjectListView):
    section_eyebrow = "Admin"
    detail_route_name = ""

    def get_detail_url(self, obj):
        return reverse(self.detail_route_name, args=[obj.pk])


class AdminNamedCreateView(AdminCatalogMixin, ModelObjectCreateView):
    section_eyebrow = "Admin"


class AdminNamedUpdateView(AdminCatalogMixin, ModelObjectUpdateView):
    section_eyebrow = "Admin"


class AdminNamedDeleteView(AdminCatalogMixin, ModelObjectDeleteView):
    section_eyebrow = "Admin"


class AdminNamedDetailView(AdminCatalogMixin, ModelObjectDetailView):
    section_eyebrow = "Admin"


class AdminCategoryListView(AdminNamedListView):
    model = Category
    detail_route_name = "admin:category-detail"
    page_title = "Categories"


class AdminCategoryDetailView(AdminNamedDetailView):
    model = Category
    page_title = "Category"


class AdminCategoryCreateView(AdminNamedCreateView):
    model = Category
    page_title = "Add category"
    success_message = "Category created."

    def get_success_url(self):
        return reverse("admin:categories")


class AdminCategoryUpdateView(AdminNamedUpdateView):
    model = Category
    page_title = "Edit category"
    success_message = "Category updated."

    def get_success_url(self):
        return reverse("admin:category-detail", args=[self.object.pk])


class AdminCategoryDeleteView(AdminNamedDeleteView):
    model = Category
    page_title = "Delete category"
    success_message = "Category deleted."
    success_url = reverse_lazy("admin:categories")


class AdminUseCaseListView(AdminNamedListView):
    model = UseCase
    detail_route_name = "admin:use-case-detail"
    page_title = "Use cases"


class AdminUseCaseDetailView(AdminNamedDetailView):
    model = UseCase
    page_title = "Use case"


class AdminUseCaseCreateView(AdminNamedCreateView):
    model = UseCase
    page_title = "Add use case"
    success_message = "Use case created."

    def get_success_url(self):
        return reverse("admin:use-cases")


class AdminUseCaseUpdateView(AdminNamedUpdateView):
    model = UseCase
    page_title = "Edit use case"
    success_message = "Use case updated."

    def get_success_url(self):
        return reverse("admin:use-case-detail", args=[self.object.pk])


class AdminUseCaseDeleteView(AdminNamedDeleteView):
    model = UseCase
    page_title = "Delete use case"
    success_message = "Use case deleted."
    success_url = reverse_lazy("admin:use-cases")


class AdminUseCaseAssignmentListView(AdminNamedListView):
    model = UseCaseCategory
    detail_route_name = "admin:use-case-assignment-detail"
    page_title = "Use case assignments"


class AdminUseCaseAssignmentDetailView(AdminNamedDetailView):
    model = UseCaseCategory
    page_title = "Use case assignment"


class AdminUseCaseAssignmentCreateView(AdminNamedCreateView):
    model = UseCaseCategory
    page_title = "Add use case assignment"
    success_message = "Use case assignment created."

    def get_success_url(self):
        return reverse("admin:use-case-assignments")


class AdminUseCaseAssignmentUpdateView(AdminNamedUpdateView):
    model = UseCaseCategory
    page_title = "Edit use case assignment"
    success_message = "Use case assignment updated."

    def get_success_url(self):
        return reverse("admin:use-case-assignment-detail", args=[self.object.pk])


class AdminUseCaseAssignmentDeleteView(AdminNamedDeleteView):
    model = UseCaseCategory
    page_title = "Delete use case assignment"
    success_message = "Use case assignment deleted."
    success_url = reverse_lazy("admin:use-case-assignments")


class AdminPlanListView(AdminNamedListView):
    model = Plan
    detail_route_name = "admin:plan-detail"
    page_title = "Plans"


class AdminPlanDetailView(AdminNamedDetailView):
    model = Plan
    page_title = "Plan"


class AdminPlanCreateView(AdminNamedCreateView):
    model = Plan
    page_title = "Add plan"
    success_message = "Plan created."

    def get_success_url(self):
        return reverse("admin:plans")


class AdminPlanUpdateView(AdminNamedUpdateView):
    model = Plan
    page_title = "Edit plan"
    success_message = "Plan updated."

    def get_success_url(self):
        return reverse("admin:plan-detail", args=[self.object.pk])


class AdminPlanDeleteView(AdminNamedDeleteView):
    model = Plan
    page_title = "Delete plan"
    success_message = "Plan deleted."
    success_url = reverse_lazy("admin:plans")


class AdminPlanFeatureListView(AdminNamedListView):
    model = PlanFeature
    detail_route_name = "admin:plan-feature-detail"
    page_title = "Plan features"


class AdminPlanFeatureDetailView(AdminNamedDetailView):
    model = PlanFeature
    page_title = "Plan feature"


class AdminPlanFeatureCreateView(AdminNamedCreateView):
    model = PlanFeature
    page_title = "Add plan feature"
    success_message = "Plan feature created."

    def get_success_url(self):
        return reverse("admin:plan-features")


class AdminPlanFeatureUpdateView(AdminNamedUpdateView):
    model = PlanFeature
    page_title = "Edit plan feature"
    success_message = "Plan feature updated."

    def get_success_url(self):
        return reverse("admin:plan-feature-detail", args=[self.object.pk])


class AdminPlanFeatureDeleteView(AdminNamedDeleteView):
    model = PlanFeature
    page_title = "Delete plan feature"
    success_message = "Plan feature deleted."
    success_url = reverse_lazy("admin:plan-features")


class AdminPlanAssignmentListView(AdminNamedListView):
    model = PlanFeatureAssignment
    detail_route_name = "admin:plan-assignment-detail"
    page_title = "Plan assignments"


class AdminPlanAssignmentDetailView(AdminNamedDetailView):
    model = PlanFeatureAssignment
    page_title = "Plan assignment"


class AdminPlanAssignmentCreateView(AdminNamedCreateView):
    model = PlanFeatureAssignment
    page_title = "Add plan assignment"
    success_message = "Plan assignment created."

    def get_success_url(self):
        return reverse("admin:plan-assignments")


class AdminPlanAssignmentUpdateView(AdminNamedUpdateView):
    model = PlanFeatureAssignment
    page_title = "Edit plan assignment"
    success_message = "Plan assignment updated."

    def get_success_url(self):
        return reverse("admin:plan-assignment-detail", args=[self.object.pk])


class AdminPlanAssignmentDeleteView(AdminNamedDeleteView):
    model = PlanFeatureAssignment
    page_title = "Delete plan assignment"
    success_message = "Plan assignment deleted."
    success_url = reverse_lazy("admin:plan-assignments")


class AdminProductListView(AdminNamedListView):
    model = Product
    detail_route_name = "admin:product-detail"
    page_title = "Products"


class AdminProductDetailView(AdminNamedDetailView):
    model = Product
    page_title = "Product"


class AdminProductCreateView(AdminNamedCreateView):
    model = Product
    page_title = "Add product"
    success_message = "Product created."

    def get_success_url(self):
        return reverse("admin:products")


class AdminProductUpdateView(AdminNamedUpdateView):
    model = Product
    page_title = "Edit product"
    success_message = "Product updated."

    def get_success_url(self):
        return reverse("admin:product-detail", args=[self.object.pk])


class AdminProductDeleteView(AdminNamedDeleteView):
    model = Product
    page_title = "Delete product"
    success_message = "Product deleted."
    success_url = reverse_lazy("admin:products")


class AdminProductAnalyticsView(AdminCatalogMixin, DashboardView):
    page_title = "Product analytics"
    section_eyebrow = "Admin · Products"

    def get_metrics(self):
        product = Product.objects.select_related("analytics").get(pk=self.kwargs["pk"])
        analytics = getattr(product, "analytics", None)
        if not analytics:
            return [
                {"label": "Visitors", "value": 0, "help_text": "No analytics attached yet."},
                {"label": "Signups", "value": 0, "help_text": "No analytics attached yet."},
                {"label": "Revenue", "value": 0, "help_text": "No analytics attached yet."},
            ]
        return [
            {
                "label": "Visitors",
                "value": analytics.monthly_visitors,
                "help_text": "Trailing 30 days.",
            },
            {
                "label": "Signups",
                "value": analytics.monthly_signups,
                "help_text": "Trailing 30 days.",
            },
            {
                "label": "Revenue",
                "value": analytics.verified_revenue,
                "help_text": "Verified monthly revenue.",
            },
        ]


class AdminAlternativeProductListView(AdminNamedListView):
    model = AlternativeProduct
    detail_route_name = "admin:alternative-detail"
    page_title = "Alternative products"


class AdminAlternativeProductDetailView(AdminNamedDetailView):
    model = AlternativeProduct
    page_title = "Alternative product"


class AdminAlternativeProductCreateView(AdminNamedCreateView):
    model = AlternativeProduct
    page_title = "Add alternative product"
    success_message = "Alternative product entry created."

    def get_success_url(self):
        return reverse("admin:alternatives")


class AdminAlternativeProductUpdateView(AdminNamedUpdateView):
    model = AlternativeProduct
    page_title = "Edit alternative product"
    success_message = "Alternative product entry updated."

    def get_success_url(self):
        return reverse("admin:alternative-detail", args=[self.object.pk])


class AdminAlternativeProductDeleteView(AdminNamedDeleteView):
    model = AlternativeProduct
    page_title = "Delete alternative product"
    success_message = "Alternative product entry deleted."
    success_url = reverse_lazy("admin:alternatives")


class AdminProductBadgeListView(AdminNamedListView):
    model = ProductBadge
    detail_route_name = "admin:product-badge-detail"
    page_title = "Product badges"


class AdminProductBadgeDetailView(AdminNamedDetailView):
    model = ProductBadge
    page_title = "Product badge"


class AdminProductBadgeCreateView(AdminNamedCreateView):
    model = ProductBadge
    page_title = "Add product badge"
    success_message = "Product badge created."

    def get_success_url(self):
        return reverse("admin:product-badges")


class AdminFeedbackListView(AdminNamedListView):
    model = MemberFeedback
    detail_route_name = "admin:feedback-detail"
    page_title = "Feedback"


class AdminFeedbackDetailView(AdminNamedDetailView):
    model = MemberFeedback
    page_title = "Feedback"
