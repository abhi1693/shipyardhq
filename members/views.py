from django.shortcuts import redirect, render
from django.views.generic import RedirectView, TemplateView

from catalog.models import Product


class MemberRequiredMixin:
    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return render(request, "members/auth_required.html", status=403)
        return super().dispatch(request, *args, **kwargs)


class MemberHomeView(MemberRequiredMixin, TemplateView):
    def get(self, request, *args, **kwargs):
        return redirect("member_overview")


class MemberOverviewView(MemberRequiredMixin, TemplateView):
    template_name = "members/overview.html"
    active_member_nav = "overview"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        product_count = 0
        if self.request.user.pk is not None:
            product_count = Product.objects.filter(owner=self.request.user).count()
        context["active_member_nav"] = self.active_member_nav
        context["member_title"] = "Dashboard"
        context["member_product_count"] = product_count
        return context


class MemberDashboardRedirectView(MemberRequiredMixin, RedirectView):
    pattern_name = "member_overview"
    permanent = False


class MemberLaunchView(MemberRequiredMixin, TemplateView):
    template_name = "members/launch.html"
    active_member_nav = "launch"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["active_member_nav"] = self.active_member_nav
        context["member_title"] = "Launch"
        return context


class MemberProfileView(MemberRequiredMixin, TemplateView):
    template_name = "members/profile.html"
    active_member_nav = "profile"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["active_member_nav"] = self.active_member_nav
        context["member_title"] = "Profile"
        return context
