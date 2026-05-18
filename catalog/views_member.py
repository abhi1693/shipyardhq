from django.contrib import messages
from django.shortcuts import get_object_or_404
from django.urls import reverse, reverse_lazy
from django.views.generic import FormView

from catalog.forms import MemberProductForm, ProductClaimForm
from catalog.models import MemberFeedback, Product
from core.generic_views import (
    DashboardView,
    ModelObjectCreateView,
    ModelObjectDeleteView,
    ModelObjectDetailView,
    ModelObjectListView,
    ModelObjectUpdateView,
)
from core.mixins import OnboardingRequiredMixin
from rewards.models import RewardBalance


class MemberShellMixin(OnboardingRequiredMixin):
    base_template = "base/private.html"
    section_eyebrow = "Member"


class MemberOverviewView(MemberShellMixin, DashboardView):
    page_title = "Overview"
    page_description = (
        "Your Shipyard workspace for listings, feedback, rewards, and product performance."
    )

    def get_metrics(self):
        products = Product.objects.filter(owner=self.request.user)
        reward_balance = RewardBalance.objects.filter(user=self.request.user).first()
        return [
            {
                "label": "Products",
                "value": products.count(),
                "help_text": "Listings owned by this account.",
            },
            {
                "label": "Published",
                "value": products.filter(status=Product.ProductStatus.PUBLISHED).count(),
                "help_text": "Listings visible on the public site.",
            },
            {
                "label": "Reward points",
                "value": getattr(reward_balance, "balance", 0),
                "help_text": "Available reward balance.",
            },
        ]

    def get_cards(self):
        return [
            {
                "label": "Listings",
                "title": "Manage products",
                "body": "Add, edit, verify, and upgrade product pages.",
                "url": "/member/products",
                "cta": "Open products",
            },
            {
                "label": "Feedback",
                "title": "Track member feedback",
                "body": "Review requests, follow-ups, and product-specific notes.",
                "url": "/member/feedback",
                "cta": "Open feedback",
            },
        ]


class MemberFeedbackView(MemberShellMixin, ModelObjectListView):
    model = MemberFeedback
    fields = ("subject", "product", "status", "created_at")
    page_title = "Feedback"

    def get_queryset(self):
        return MemberFeedback.objects.filter(user=self.request.user).select_related("product")


class MemberProductListView(MemberShellMixin, ModelObjectListView):
    model = Product
    fields = ("name", "tagline", "pricing_model", "status", "platform")
    page_title = "Products"

    def get_queryset(self):
        return Product.objects.filter(owner=self.request.user).order_by("name")

    def get_detail_url(self, obj):
        return reverse("member:product-detail", args=[obj.slug])


class MemberOwnedProductMixin(MemberShellMixin):
    def get_owned_product(self):
        return get_object_or_404(Product, owner=self.request.user, slug=self.kwargs["slug"])


class MemberProductDetailView(MemberOwnedProductMixin, ModelObjectDetailView):
    model = Product
    fields = (
        "name",
        "tagline",
        "description",
        "website_url",
        "pricing_model",
        "status",
        "platform",
    )

    def get_object(self, queryset=None):
        return self.get_owned_product()


class MemberProductCreateView(MemberShellMixin, ModelObjectCreateView):
    model = Product
    form_class = MemberProductForm
    page_title = "Add product"
    success_message = "Product created."

    def form_valid(self, form):
        form.instance.owner = self.request.user
        if not form.instance.status:
            form.instance.status = Product.ProductStatus.DRAFT
        return super().form_valid(form)

    def get_success_url(self):
        return reverse("member:products")


class MemberProductUpdateView(MemberOwnedProductMixin, ModelObjectUpdateView):
    model = Product
    form_class = MemberProductForm
    page_title = "Edit product"
    success_message = "Product updated."

    def get_object(self, queryset=None):
        return self.get_owned_product()

    def get_success_url(self):
        return reverse("member:product-detail", args=[self.object.slug])


class MemberProductDeleteView(MemberOwnedProductMixin, ModelObjectDeleteView):
    model = Product
    page_title = "Delete product"
    success_message = "Product deleted."
    success_url = reverse_lazy("member:products")

    def get_object(self, queryset=None):
        return self.get_owned_product()


class MemberProductAnalyticsView(MemberOwnedProductMixin, DashboardView):
    base_template = "base/private.html"
    section_eyebrow = "Member · Product analytics"
    page_title = "Product analytics"

    def get_metrics(self):
        product = self.get_owned_product()
        analytics = getattr(product, "analytics", None)
        if not analytics:
            return [
                {"label": "Visitors", "value": 0, "help_text": "Analytics not connected yet."},
                {"label": "Signups", "value": 0, "help_text": "Analytics not connected yet."},
                {"label": "Revenue", "value": 0, "help_text": "Revenue not connected yet."},
            ]
        return [
            {
                "label": "Visitors",
                "value": analytics.monthly_visitors,
                "help_text": "Last 30 days.",
            },
            {"label": "Signups", "value": analytics.monthly_signups, "help_text": "Last 30 days."},
            {
                "label": "Revenue",
                "value": analytics.verified_revenue,
                "help_text": "Verified recurring revenue.",
            },
        ]


class MemberProductUpgradeView(MemberOwnedProductMixin, DashboardView):
    base_template = "base/private.html"
    section_eyebrow = "Member · Upgrades"
    page_title = "Upgrade product"
    page_description = (
        "Review the plan, placement, and entitlement paths available "
        "for this product."
    )

    def get_cards(self):
        product = self.get_owned_product()
        return [
            {
                "label": "Product",
                "title": product.name,
                "body": "Select plan, featured placement, and add-on entitlements.",
                "url": "/pricing",
                "cta": "See plans",
            },
        ]


class MemberProductClaimView(MemberShellMixin, FormView):
    form_class = ProductClaimForm
    template_name = "generic/object_form.html"
    success_url = reverse_lazy("member:products")

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["base_template"] = "base/private.html"
        context["page_title"] = "Claim product"
        context["section_eyebrow"] = "Member"
        return context

    def form_valid(self, form):
        claim = form.save(commit=False)
        claim.claimant = self.request.user
        claim.save()
        messages.success(self.request, "Claim request submitted.")
        return super().form_valid(form)
