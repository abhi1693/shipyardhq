from django.db.models import Count
from django.db.models.deletion import ProtectedError
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils.functional import cached_property
from django.views.generic import RedirectView, TemplateView

from accounts.forms import UserEditForm
from accounts.models import User
from accounts.tables import UserTable
from catalog.forms import CategoryEditForm, UseCaseEditForm
from catalog.models import Category, Product, UseCase
from catalog.tables import CategoryTable, ProductTable, UseCaseTable


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


class MemberSuperuserRequiredMixin(MemberPageMixin):
    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return render(request, "members/auth_required.html", status=403)
        if not request.user.is_active or not request.user.is_superuser:
            return render(
                request,
                "members/permission_denied.html",
                {
                    "active_member_nav": "",
                    "member_title": "Not available",
                    "breadcrumbs": (
                        {"label": "Home", "url": reverse("home")},
                        {"label": "Member", "url": reverse("member_overview")},
                        {"label": "Not available", "url": ""},
                    ),
                },
                status=403,
            )
        return super().dispatch(request, *args, **kwargs)


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


class MemberCategoriesView(MemberSuperuserRequiredMixin, TemplateView):
    template_name = "members/categories.html"
    active_member_nav = "categories"
    member_title = "Categories"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        queryset = (
            Category.objects.select_related("parent")
            .annotate(product_count=Count("products", distinct=True), child_count=Count("children", distinct=True))
            .order_by("name")
        )
        context["member_category_count"] = queryset.count()
        context["table"] = CategoryTable(queryset).configure(self.request)
        return context


class MemberCategoryAddView(MemberSuperuserRequiredMixin, TemplateView):
    template_name = "members/category_add.html"
    active_member_nav = "categories"
    member_title = "Add a new category"

    def get_breadcrumbs(self):
        return (
            {"label": "Home", "url": reverse("home")},
            {"label": "Member", "url": reverse("member_overview")},
            {"label": "Categories", "url": reverse("member_categories")},
            {"label": "Add", "url": ""},
        )

    def get_form(self):
        return CategoryEditForm(self.request.POST or None)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["form"] = kwargs.get("form") or self.get_form()
        return context

    def post(self, request, *args, **kwargs):
        form = self.get_form()
        if form.is_valid():
            category = form.save()
            return redirect("member_category", pk=category.pk)
        return self.render_to_response(self.get_context_data(form=form))


class MemberCategoryObjectMixin(MemberSuperuserRequiredMixin):
    active_member_nav = "categories"
    member_title = "Category"

    @cached_property
    def target_category(self):
        return get_object_or_404(
            Category.objects.select_related("parent").annotate(
                product_count=Count("products", distinct=True),
                child_count=Count("children", distinct=True),
            ),
            pk=self.kwargs["pk"],
        )

    def get_breadcrumbs(self):
        return (
            {"label": "Home", "url": reverse("home")},
            {"label": "Member", "url": reverse("member_overview")},
            {"label": "Categories", "url": reverse("member_categories")},
            {"label": self.target_category.name, "url": ""},
        )

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["target_category"] = self.target_category
        context["target_category_initial"] = self.target_category.name[:1].upper()
        return context


class MemberCategoryDetailView(MemberCategoryObjectMixin, TemplateView):
    template_name = "members/category_detail.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        queryset = (
            Product.objects.filter(category=self.target_category)
            .select_related("category", "product_type", "pricing_model")
            .order_by("-last_updated", "-created", "name")
        )
        context["target_category_products_table"] = ProductTable(queryset).configure(self.request)
        return context


class MemberCategoryEditView(MemberCategoryObjectMixin, TemplateView):
    template_name = "members/category_edit.html"
    member_title = "Editing category"

    def get_breadcrumbs(self):
        return (*super().get_breadcrumbs(), {"label": "Edit", "url": ""})

    def get_form(self):
        return CategoryEditForm(self.request.POST or None, instance=self.target_category)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["member_title"] = f"Editing category {self.target_category.name}"
        context["form"] = kwargs.get("form") or self.get_form()
        return context

    def post(self, request, *args, **kwargs):
        form = self.get_form()
        if form.is_valid():
            category = form.save()
            return redirect("member_category", pk=category.pk)
        return self.render_to_response(self.get_context_data(form=form))


class MemberCategoryDeleteView(MemberCategoryObjectMixin, TemplateView):
    template_name = "members/category_delete.html"
    member_title = "Delete category"

    def get_breadcrumbs(self):
        return (*super().get_breadcrumbs(), {"label": "Delete", "url": ""})

    def get_delete_blockers(self):
        blockers = []
        if self.target_category.child_count:
            blockers.append("Move or remove child categories before deleting this category.")
        if self.target_category.product_count:
            blockers.append("Move or remove products before deleting this category.")
        return blockers

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["delete_blockers"] = kwargs.get("delete_blockers", self.get_delete_blockers())
        context["delete_error"] = kwargs.get("delete_error", "")
        return context

    def post(self, request, *args, **kwargs):
        blockers = self.get_delete_blockers()
        if blockers:
            return self.render_to_response(self.get_context_data(delete_blockers=blockers))

        try:
            self.target_category.delete()
        except ProtectedError:
            return self.render_to_response(
                self.get_context_data(
                    delete_error="This category is still connected to items that must be moved first."
                )
            )

        return redirect("member_categories")


class MemberUseCasesView(MemberSuperuserRequiredMixin, TemplateView):
    template_name = "members/use_cases.html"
    active_member_nav = "use_cases"
    member_title = "Use cases"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        queryset = (
            UseCase.objects.prefetch_related("categories")
            .annotate(
                product_count=Count("product_assignments", distinct=True),
                category_count=Count("category_links", distinct=True),
            )
            .order_by("name")
        )
        context["member_use_case_count"] = queryset.count()
        context["table"] = UseCaseTable(queryset).configure(self.request)
        return context


class MemberUseCaseAddView(MemberSuperuserRequiredMixin, TemplateView):
    template_name = "members/use_case_add.html"
    active_member_nav = "use_cases"
    member_title = "Add a new use case"

    def get_breadcrumbs(self):
        return (
            {"label": "Home", "url": reverse("home")},
            {"label": "Member", "url": reverse("member_overview")},
            {"label": "Use cases", "url": reverse("member_use_cases")},
            {"label": "Add", "url": ""},
        )

    def get_form(self):
        return UseCaseEditForm(self.request.POST or None)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["form"] = kwargs.get("form") or self.get_form()
        return context

    def post(self, request, *args, **kwargs):
        form = self.get_form()
        if form.is_valid():
            use_case = form.save()
            return redirect("member_use_case", pk=use_case.pk)
        return self.render_to_response(self.get_context_data(form=form))


class MemberUseCaseObjectMixin(MemberSuperuserRequiredMixin):
    active_member_nav = "use_cases"
    member_title = "Use case"

    @cached_property
    def target_use_case(self):
        return get_object_or_404(
            UseCase.objects.prefetch_related("categories").annotate(
                product_count=Count("product_assignments", distinct=True),
                category_count=Count("category_links", distinct=True),
            ),
            pk=self.kwargs["pk"],
        )

    def get_breadcrumbs(self):
        return (
            {"label": "Home", "url": reverse("home")},
            {"label": "Member", "url": reverse("member_overview")},
            {"label": "Use cases", "url": reverse("member_use_cases")},
            {"label": self.target_use_case.name, "url": ""},
        )

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["target_use_case"] = self.target_use_case
        context["target_use_case_categories"] = self.target_use_case.categories.all()
        context["target_use_case_initial"] = self.target_use_case.name[:1].upper()
        return context


class MemberUseCaseDetailView(MemberUseCaseObjectMixin, TemplateView):
    template_name = "members/use_case_detail.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        products = (
            Product.objects.filter(use_case_assignments__use_case=self.target_use_case)
            .select_related("category", "product_type", "pricing_model")
            .distinct()
            .order_by("-last_updated", "-created", "name")
        )
        context["target_use_case_products_table"] = ProductTable(products).configure(self.request)
        return context


class MemberUseCaseEditView(MemberUseCaseObjectMixin, TemplateView):
    template_name = "members/use_case_edit.html"
    member_title = "Editing use case"

    def get_breadcrumbs(self):
        return (*super().get_breadcrumbs(), {"label": "Edit", "url": ""})

    def get_form(self):
        return UseCaseEditForm(self.request.POST or None, instance=self.target_use_case)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["member_title"] = f"Editing use case {self.target_use_case.name}"
        context["form"] = kwargs.get("form") or self.get_form()
        return context

    def post(self, request, *args, **kwargs):
        form = self.get_form()
        if form.is_valid():
            use_case = form.save()
            return redirect("member_use_case", pk=use_case.pk)
        return self.render_to_response(self.get_context_data(form=form))


class MemberUseCaseDeleteView(MemberUseCaseObjectMixin, TemplateView):
    template_name = "members/use_case_delete.html"
    member_title = "Delete use case"

    def get_breadcrumbs(self):
        return (*super().get_breadcrumbs(), {"label": "Delete", "url": ""})

    def get_delete_blockers(self):
        blockers = []
        if self.target_use_case.product_count:
            blockers.append("Remove connected products before deleting this use case.")
        return blockers

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["delete_blockers"] = kwargs.get("delete_blockers", self.get_delete_blockers())
        context["delete_error"] = kwargs.get("delete_error", "")
        return context

    def post(self, request, *args, **kwargs):
        blockers = self.get_delete_blockers()
        if blockers:
            return self.render_to_response(self.get_context_data(delete_blockers=blockers))

        try:
            self.target_use_case.delete()
        except ProtectedError:
            return self.render_to_response(
                self.get_context_data(
                    delete_error="This use case is still connected to products."
                )
            )

        return redirect("member_use_cases")


class MemberUsersView(MemberSuperuserRequiredMixin, TemplateView):
    template_name = "members/users.html"
    active_member_nav = "users"
    member_title = "Users"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        queryset = User.objects.annotate(product_count=Count("products")).order_by("email")
        context["member_user_count"] = queryset.count()
        context["table"] = UserTable(queryset).configure(self.request)
        return context


class MemberUserObjectMixin(MemberSuperuserRequiredMixin):
    active_member_nav = "users"
    member_title = "User"

    @cached_property
    def target_user(self):
        return get_object_or_404(
            User.objects.annotate(product_count=Count("products")),
            pk=self.kwargs["pk"],
        )

    @cached_property
    def target_user_display_name(self):
        return self.target_user.get_full_name() or self.target_user.email

    def get_breadcrumbs(self):
        return (
            {"label": "Home", "url": reverse("home")},
            {"label": "Member", "url": reverse("member_overview")},
            {"label": "Users", "url": reverse("member_users")},
            {"label": self.target_user.email, "url": ""},
        )

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        display_name = self.target_user_display_name
        context["target_user"] = self.target_user
        context["target_user_display_name"] = display_name
        context["target_user_initial"] = display_name[:1].upper()
        return context


class MemberUserDetailView(MemberUserObjectMixin, TemplateView):
    template_name = "members/user_detail.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        products = (
            Product.objects.filter(owner=self.target_user)
            .select_related("category", "product_type", "pricing_model")
            .order_by("-last_updated", "-created", "name")
        )
        context["target_user_products_table"] = ProductTable(products).configure(self.request)
        return context


class MemberUserEditView(MemberUserObjectMixin, TemplateView):
    template_name = "members/user_edit.html"
    member_title = "Edit user"

    def get_breadcrumbs(self):
        return (*super().get_breadcrumbs(), {"label": "Edit", "url": ""})

    def get_form(self):
        return UserEditForm(
            self.request.POST or None,
            instance=self.target_user,
            changed_by=self.request.user,
        )

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["form"] = kwargs.get("form") or self.get_form()
        return context

    def post(self, request, *args, **kwargs):
        form = self.get_form()
        if form.is_valid():
            form.save()
            return redirect("member_user", pk=self.target_user.pk)
        return self.render_to_response(self.get_context_data(form=form))


class MemberUserDeleteView(MemberUserObjectMixin, TemplateView):
    template_name = "members/user_delete.html"
    member_title = "Delete user"

    def get_breadcrumbs(self):
        return (*super().get_breadcrumbs(), {"label": "Delete", "url": ""})

    def get_delete_blockers(self):
        blockers = []
        if self.target_user.pk == self.request.user.pk:
            blockers.append("You cannot delete your own account.")
        if self.target_user.product_count:
            blockers.append("Reassign or remove this user's products before deleting this account.")
        return blockers

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["delete_blockers"] = kwargs.get("delete_blockers", self.get_delete_blockers())
        context["delete_error"] = kwargs.get("delete_error", "")
        return context

    def post(self, request, *args, **kwargs):
        blockers = self.get_delete_blockers()
        if blockers:
            return self.render_to_response(self.get_context_data(delete_blockers=blockers))

        try:
            self.target_user.delete()
        except ProtectedError:
            return self.render_to_response(
                self.get_context_data(
                    delete_error="This account is still connected to items that must be reassigned first."
                )
            )

        return redirect("member_users")
