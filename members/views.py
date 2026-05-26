from django.shortcuts import redirect, render
from django.urls import reverse
from django.views.generic import RedirectView, TemplateView

from catalog.models import Product
from catalog.tables import ProductTable


class MemberRequiredMixin:
    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return render(request, "members/auth_required.html", status=403)
        return super().dispatch(request, *args, **kwargs)


class MemberPageMixin(MemberRequiredMixin):
    active_member_nav = ""
    member_title = ""

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["active_member_nav"] = self.active_member_nav
        context["member_title"] = self.member_title
        context["breadcrumbs"] = self.get_breadcrumbs()
        return context

    def get_breadcrumbs(self):
        return (
            {"label": "Home", "url": reverse("home")},
            {"label": "Member", "url": reverse("member_overview")},
            {"label": self.member_title, "url": ""},
        )


class MemberHomeView(MemberRequiredMixin, TemplateView):
    def get(self, request, *args, **kwargs):
        return redirect("member_overview")


class MemberOverviewView(MemberPageMixin, TemplateView):
    template_name = "members/overview.html"
    active_member_nav = "overview"
    member_title = "Dashboard"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        product_count = 0
        if self.request.user.pk is not None:
            product_count = Product.objects.filter(owner=self.request.user).count()
        context["member_product_count"] = product_count
        return context


class MemberDashboardRedirectView(MemberRequiredMixin, RedirectView):
    pattern_name = "member_overview"
    permanent = False


class MemberLaunchView(MemberPageMixin, TemplateView):
    template_name = "members/launch.html"
    active_member_nav = "products"
    member_title = "Launch"


class MemberProfileView(MemberPageMixin, TemplateView):
    template_name = "members/profile.html"
    active_member_nav = "profile"
    member_title = "Profile"


class MemberProductsView(MemberPageMixin, TemplateView):
    template_name = "members/products.html"
    active_member_nav = "products"
    member_title = "Products"
    empty_table_tips = (
        {
            "icon": "image",
            "variant": "blue",
            "title": "Great visuals win",
            "text": "Add clear screenshots and a focused product image.",
        },
        {
            "icon": "writing",
            "variant": "green",
            "title": "Strong messaging",
            "text": "Write a clear tagline and explain the job your product does.",
        },
        {
            "icon": "rocket",
            "variant": "orange",
            "title": "Share widely",
            "text": "Give people one simple link when the launch is ready.",
        },
    )

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        queryset = Product.objects.none()
        if self.request.user.pk is not None:
            queryset = (
                Product.objects.filter(owner=self.request.user)
                .select_related("category", "product_type", "pricing_model")
                .order_by("-last_updated", "-created", "name")
            )
        product_count = queryset.count()
        context["member_product_count"] = product_count
        context["table"] = ProductTable(queryset).configure(self.request)
        context["empty_table_mark"] = "S"
        context["empty_table_title"] = "No products yet"
        context["empty_table_text"] = "Your shipyard is ready. Launch your first product and start building momentum."
        context["empty_table_action_label"] = "Create Your First Product"
        context["empty_table_action_url"] = reverse("member_launch")
        context["empty_table_note"] = "Takes less than 5 minutes"
        context["empty_table_tips"] = self.empty_table_tips
        return context
