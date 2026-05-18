from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth.views import LoginView, LogoutView
from django.shortcuts import redirect
from django.urls import reverse, reverse_lazy
from django.utils import timezone
from django.views.generic import FormView, TemplateView

from accounts.forms import AdminUserForm, LoginForm, OnboardingForm, ProfileForm, RegisterForm
from accounts.models import User
from core.generic_views import (
    ModelObjectCreateView,
    ModelObjectDeleteView,
    ModelObjectDetailView,
    ModelObjectListView,
    ModelObjectUpdateView,
)
from core.mixins import ActiveUserRequiredMixin, AdminRequiredMixin, OnboardingRequiredMixin


class ShipyardLoginView(LoginView):
    authentication_form = LoginForm
    template_name = "accounts/login.html"
    redirect_authenticated_user = True

    def get_success_url(self):
        if getattr(self.request.user, "role", "") == "admin":
            return reverse("admin:overview")
        return reverse("member:overview")


class ShipyardLogoutView(LogoutView):
    next_page = reverse_lazy("public:home")


class RegisterView(FormView):
    form_class = RegisterForm
    template_name = "accounts/register.html"

    def form_valid(self, form):
        user = form.save()
        login(self.request, user, backend="accounts.backends.EmailOrUsernameBackend")
        messages.success(self.request, "Account created. Finish onboarding to continue.")
        return redirect("member:onboarding")


class ProfileView(ActiveUserRequiredMixin, FormView):
    form_class = ProfileForm
    template_name = "accounts/profile.html"
    base_template = "base/private.html"
    page_title = "Profile"

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs["instance"] = self.request.user
        return kwargs

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["base_template"] = self.base_template
        context["page_title"] = self.page_title
        return context

    def form_valid(self, form):
        form.save()
        messages.success(self.request, "Profile updated.")
        return redirect(self.request.path)


class ShipyardSuspendedView(TemplateView):
    template_name = "accounts/suspended.html"


class MemberOnboardingView(ActiveUserRequiredMixin, FormView):
    form_class = OnboardingForm
    template_name = "accounts/profile.html"
    success_url = reverse_lazy("member:overview")

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs["instance"] = self.request.user
        return kwargs

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["base_template"] = "base/private.html"
        context["page_title"] = "Finish onboarding"
        return context

    def form_valid(self, form):
        user = form.save(commit=False)
        if not user.onboarded_at:
            user.onboarded_at = timezone.now()
        user.save()
        messages.success(self.request, "Onboarding completed.")
        return super().form_valid(form)


class MemberProfileView(OnboardingRequiredMixin, ProfileView):
    page_title = "Member profile"


class AdminProfileView(AdminRequiredMixin, ProfileView):
    page_title = "Admin profile"


class AdminUserListView(AdminRequiredMixin, ModelObjectListView):
    model = User
    section_eyebrow = "Admin · Users"
    fields = ("username", "email", "role", "status", "onboarded_at")


class AdminUserDetailView(AdminRequiredMixin, ModelObjectDetailView):
    model = User
    section_eyebrow = "Admin · Users"


class AdminUserCreateView(AdminRequiredMixin, ModelObjectCreateView):
    model = User
    form_class = RegisterForm
    section_eyebrow = "Admin · Users"
    page_title = "Add user"
    success_message = "User created."

    def get_success_url(self):
        return reverse("admin:users")


class AdminUserUpdateView(AdminRequiredMixin, ModelObjectUpdateView):
    model = User
    form_class = AdminUserForm
    section_eyebrow = "Admin · Users"
    page_title = "Edit user"
    success_message = "User updated."

    def get_success_url(self):
        return reverse("admin:user-detail", args=[self.object.pk])


class AdminUserDeleteView(AdminRequiredMixin, ModelObjectDeleteView):
    model = User
    section_eyebrow = "Admin · Users"
    page_title = "Delete user"
    success_message = "User deleted."
    success_url = reverse_lazy("admin:users")
