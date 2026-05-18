from urllib.parse import urlencode

from django.contrib.auth.mixins import AccessMixin
from django.shortcuts import redirect
from django.urls import reverse


class ActiveUserRequiredMixin(AccessMixin):
    login_url = "login"

    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return self.handle_no_permission()

        if getattr(request.user, "status", "") == "suspended":
            return redirect("suspended")

        return super().dispatch(request, *args, **kwargs)


class OnboardingRequiredMixin(ActiveUserRequiredMixin):
    onboarding_url_name = "member:onboarding"

    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return self.handle_no_permission()

        if getattr(request.user, "status", "") == "suspended":
            return redirect("suspended")

        onboarding_url = reverse(self.onboarding_url_name)
        if not request.user.onboarded_at and request.path != onboarding_url:
            query = urlencode({"next": request.get_full_path()})
            return redirect(f"{onboarding_url}?{query}")

        return super(ActiveUserRequiredMixin, self).dispatch(request, *args, **kwargs)


class AdminRequiredMixin(ActiveUserRequiredMixin):
    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return self.handle_no_permission()
        if getattr(request.user, "status", "") == "suspended":
            return redirect("suspended")
        if not (request.user.is_staff or getattr(request.user, "role", "") == "admin"):
            return redirect("member:overview")
        return super(ActiveUserRequiredMixin, self).dispatch(request, *args, **kwargs)
