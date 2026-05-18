from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404, redirect
from django.views.generic import View

from catalog.models import AlternativeProduct, Category, Plan, Product, Tag, UseCase
from core.generic_views import DashboardView, ModelObjectDetailView, ModelObjectListView

User = get_user_model()


class PublicShellMixin:
    base_template = "base/public.html"
    section_eyebrow = "Public"


class HomeView(PublicShellMixin, DashboardView):
    page_title = "Launch, compare, and grow software products"
    page_description = (
        "Shipyard HQ organizes product listings, taxonomy, analytics, "
        "and membership around the core product models."
    )

    def get_metrics(self):
        return [
            {
                "label": "Products",
                "value": Product.objects.count(),
                "help_text": "Directory listings managed in-house.",
            },
            {
                "label": "Categories",
                "value": Category.objects.count(),
                "help_text": "Taxonomy for browse, rankings, and SEO.",
            },
            {
                "label": "Pricing plans",
                "value": Plan.objects.count(),
                "help_text": "Member and placement plans.",
            },
        ]

    def get_cards(self):
        return [
            {
                "label": "Explore",
                "title": "Browse products",
                "body": "Find products by category, platform, or pricing.",
                "url": "/browse",
                "cta": "Browse",
            },
            {
                "label": "Members",
                "title": "Claim and manage listings",
                "body": "Use the member workspace to add and tune product pages.",
                "url": "/member/overview",
                "cta": "Open member area",
            },
        ]


class ProductPublicListView(PublicShellMixin, ModelObjectListView):
    model = Product
    fields = ("name", "tagline", "pricing_model", "platform", "status")
    page_title = "Browse products"
    page_description = "Discover products across categories, pricing models, and platforms."

    def get_queryset(self):
        return (
            Product.objects.select_related("owner")
            .prefetch_related("categories", "use_cases", "tags")
            .order_by("name")
        )


class BrowseView(ProductPublicListView):
    pass


class ProductDetailView(PublicShellMixin, ModelObjectDetailView):
    model = Product
    slug_field = "slug"
    slug_url_kwarg = "slug"
    fields = (
        "name",
        "tagline",
        "description",
        "website_url",
        "product_type",
        "pricing_model",
        "platform",
        "status",
        "owner",
    )


class CategoryListView(PublicShellMixin, ModelObjectListView):
    model = Category
    page_title = "Categories"
    fields = ("name", "hero_title", "seo_summary")


class CategoryDetailView(PublicShellMixin, ModelObjectDetailView):
    model = Category
    slug_field = "slug"
    slug_url_kwarg = "slug"
    fields = ("name", "hero_title", "seo_summary", "description")


class CategoryPricingView(ProductPublicListView):
    page_title = "Category pricing"

    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .filter(
                categories__slug=self.kwargs["slug"],
                pricing_model=self.kwargs["pricing_model"],
            )
        )


class CategoryPlatformView(ProductPublicListView):
    page_title = "Category platforms"

    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .filter(
                categories__slug=self.kwargs["slug"],
                platform=self.kwargs["platform"],
            )
        )


class PricingListView(PublicShellMixin, ModelObjectListView):
    model = Plan
    page_title = "Pricing"
    fields = ("name", "plan_type", "interval", "amount", "currency")


class PricingDetailView(ProductPublicListView):
    page_title = "Pricing segment"

    def get_queryset(self):
        return super().get_queryset().filter(pricing_model=self.kwargs["pricing_model"])


class ProductTypeDetailView(ProductPublicListView):
    page_title = "Product type"

    def get_queryset(self):
        return super().get_queryset().filter(product_type=self.kwargs["product_type"])


class PlatformDetailView(ProductPublicListView):
    page_title = "Platform"

    def get_queryset(self):
        return super().get_queryset().filter(platform=self.kwargs["platform"])


class UseCaseListView(PublicShellMixin, ModelObjectListView):
    model = UseCase
    page_title = "Use cases"
    fields = ("name", "hero_title", "description")


class UseCaseDetailView(PublicShellMixin, ModelObjectDetailView):
    model = UseCase
    slug_field = "slug"
    slug_url_kwarg = "slug"
    fields = ("name", "hero_title", "description")


class AlternativesListView(PublicShellMixin, ModelObjectListView):
    model = AlternativeProduct
    page_title = "Alternatives"
    fields = ("name", "summary", "website_url")


class AlternativeDetailView(PublicShellMixin, ModelObjectDetailView):
    model = AlternativeProduct
    slug_field = "slug"
    slug_url_kwarg = "slug"
    fields = ("name", "summary", "description", "website_url", "logo_url")


class TagsListView(PublicShellMixin, ModelObjectListView):
    model = Tag
    page_title = "Tags"
    fields = ("name", "description")


class TagDetailView(PublicShellMixin, ModelObjectDetailView):
    model = Tag
    slug_field = "slug"
    slug_url_kwarg = "slug"
    fields = ("name", "description")


class UsersListView(PublicShellMixin, ModelObjectListView):
    model = User
    page_title = "Founders and members"
    fields = ("username", "display_name", "first_name", "last_name")


class UserDetailView(PublicShellMixin, ModelObjectDetailView):
    model = User
    fields = ("username", "display_name", "first_name", "last_name", "bio")

    def get_object(self, queryset=None):
        user_ref = self.kwargs["user_ref"]
        queryset = queryset or User.objects.all()
        if user_ref.isdigit():
            return get_object_or_404(queryset, pk=int(user_ref))
        return get_object_or_404(queryset, username=user_ref)


class WhyShipyardView(PublicShellMixin, DashboardView):
    page_title = "Why Shipyard"
    page_description = (
        "Shipyard HQ keeps product discovery, member operations, and "
        "trust signals centered on the product record."
    )
    cards = [
        {
            "label": "Directory",
            "title": "Products stay first-class",
            "body": (
                "Listings, alternatives, verification, analytics, and "
                "rewards all attach directly to product data."
            ),
        },
        {
            "label": "Operations",
            "title": "Member and admin views derive from the schema",
            "body": (
                "The public site, member area, and admin area expose "
                "the same domain models rather than separate content modules."
            ),
        },
        {
            "label": "Signals",
            "title": "Revenue, traffic, and rewards remain linked",
            "body": (
                "Billing snapshots, traffic imports, and reward events "
                "can all be audited against the same model graph."
            ),
        },
    ]


class LegalPrivacyView(PublicShellMixin, DashboardView):
    page_title = "Privacy policy"
    page_description = "Privacy handling for account, listing, analytics, and reward data."
    cards = [
        {
            "label": "Account data",
            "title": "User and login information",
            "body": (
                "Shipyard HQ stores account details required for "
                "authentication, onboarding, product ownership, and operator review."
            ),
        },
        {
            "label": "Product data",
            "title": "Listings and verification evidence",
            "body": (
                "Product metadata, claims, billing connections, and "
                "verification records are stored to operate the directory and member tools."
            ),
        },
        {
            "label": "Operational data",
            "title": "Analytics and reward activity",
            "body": (
                "Traffic imports, leaderboard runs, entitlements, and "
                "reward transactions are retained for reporting, auditing, and fraud prevention."
            ),
        },
    ]


class LegalTermsView(PublicShellMixin, DashboardView):
    page_title = "Terms"
    page_description = (
        "Baseline terms for using the directory, member workspace, "
        "and operator tooling."
    )
    cards = [
        {
            "label": "Listings",
            "title": "Product owners are responsible for submissions",
            "body": (
                "Members are expected to keep product information, "
                "pricing, and verification evidence accurate and current."
            ),
        },
        {
            "label": "Moderation",
            "title": "Shipyard HQ may review or remove records",
            "body": (
                "Admin operators can review claims, verification data, "
                "payment links, and reward activity to protect the integrity of the directory."
            ),
        },
        {
            "label": "Access",
            "title": "Accounts and entitlements are conditional",
            "body": (
                "Member access, placements, and paid features depend on "
                "valid account status, billing state, and platform policy compliance."
            ),
        },
    ]


class RedirectLinkView(View):
    def get(self, request, *args, **kwargs):
        return redirect("public:home")
