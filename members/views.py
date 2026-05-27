import json

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Count, Q
from django.db.models.deletion import ProtectedError
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils.functional import cached_property
from django.views import View
from django.views.generic import RedirectView, TemplateView

from accounts.forms import UserEditForm
from accounts.models import User
from accounts.tables import UserTable
from catalog.autofill import build_product_autofill
from catalog.forms import (
    CategoryEditForm,
    PlatformEditForm,
    PricingModelEditForm,
    ProductEditForm,
    ProductTypeEditForm,
    UseCaseEditForm,
)
from catalog.media_storage import delete_media_urls, product_media_urls
from catalog.models import Category, Platform, PricingModel, Product, ProductMedia, ProductType, UseCase
from catalog.tables import CategoryTable, PlatformTable, PricingModelTable, ProductTable, ProductTypeTable, UseCaseTable


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


class MemberLaunchView(MemberRequiredMixin, RedirectView):
    pattern_name = "member_product_add"
    permanent = False


class MemberProductAutofillView(MemberRequiredMixin, View):
    http_method_names = ["post"]

    def post(self, request, *args, **kwargs):
        try:
            payload = json.loads(request.body.decode("utf-8"))
            url = payload.get("url", "")
            suggestion = build_product_autofill(
                url,
                categories=Category.objects.filter(is_active=True).order_by("name"),
                product_types=ProductType.objects.filter(is_active=True).order_by("name"),
                pricing_models=PricingModel.objects.filter(is_active=True).order_by("name"),
                platforms=Platform.objects.filter(is_active=True).order_by("name"),
            )
        except (json.JSONDecodeError, UnicodeDecodeError):
            return JsonResponse({"error": "Autofill could not read this request."}, status=400)
        except ValidationError as exc:
            message = exc.messages[0] if exc.messages else "Autofill could not read this website."
            return JsonResponse({"error": message}, status=400)

        return JsonResponse({"suggestion": suggestion})


class MemberProfileView(MemberPageMixin, TemplateView):
    template_name = "members/profile.html"
    active_member_nav = "profile"
    member_title = "Profile"


class MemberProductAccessMixin(MemberPageMixin):
    active_member_nav = "products"

    def get_product_queryset(self):
        queryset = (
            Product.objects.select_related("owner", "product_type", "pricing_model")
            .prefetch_related(
                "category_assignments__category",
                "platform_assignments__platform",
                "media",
            )
            .order_by("-last_updated", "-created", "name")
        )
        if not self.request.user.is_superuser:
            queryset = queryset.filter(owner=self.request.user)
        return queryset


class MemberProductsView(MemberProductAccessMixin, TemplateView):
    template_name = "members/products.html"
    member_title = "Products"
    filter_all_value = "__all__"
    status_options = (
        (filter_all_value, "All status"),
        (Product.Status.DRAFT, "Draft"),
        (Product.Status.REVIEW, "In review"),
        (Product.Status.PUBLISHED, "Published"),
        (Product.Status.ARCHIVED, "Archived"),
    )
    sort_options = (
        ("new", "Newest"),
        ("updated", "Recently updated"),
        ("az", "A-Z"),
    )
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
        base_queryset = self.get_product_queryset()
        all_product_count = base_queryset.count()
        queryset = self.apply_filters(base_queryset)
        product_count = queryset.count()
        filter_values = self.get_filter_values()
        context["member_product_count"] = product_count
        context["member_all_product_count"] = all_product_count
        context["member_product_has_filters"] = self.has_active_filters(filter_values)
        context["member_product_filter_values"] = filter_values
        context["member_product_status_options"] = self.status_options
        context["member_product_sort_options"] = self.sort_options
        context["member_product_active_filters"] = self.get_active_filter_labels(filter_values)
        context["table"] = ProductTable(
            queryset,
            show_owner=self.request.user.is_superuser,
            show_actions=True,
            order_by_field="table_sort",
        ).configure(self.request)
        context["empty_table_mark"] = "S"
        context["empty_table_title"] = "No products yet"
        context["empty_table_text"] = "Your shipyard is ready. Launch your first product and start building momentum."
        context["empty_table_action_label"] = "Create Your First Product"
        context["empty_table_action_url"] = reverse("member_product_add")
        context["empty_table_note"] = "Takes less than 5 minutes"
        context["empty_table_tips"] = self.empty_table_tips
        return context

    def get_filter_values(self):
        q = self.request.GET.get("q", "").strip()
        status = self.request.GET.get("status", self.filter_all_value)
        sort = self.request.GET.get("sort", "new")

        valid_statuses = {value for value, _label in self.status_options}
        valid_sorts = {value for value, _label in self.sort_options}
        if status not in valid_statuses:
            status = self.filter_all_value
        if sort not in valid_sorts:
            sort = "new"

        return {"q": q, "status": status, "sort": sort}

    def apply_filters(self, queryset):
        values = self.get_filter_values()
        if values["q"]:
            queryset = queryset.filter(
                Q(name__icontains=values["q"])
                | Q(slug__icontains=values["q"])
                | Q(tagline__icontains=values["q"])
            )

        if values["status"] != self.filter_all_value:
            queryset = queryset.filter(status=values["status"])

        match values["sort"]:
            case "updated":
                return queryset.order_by("-last_updated", "-created", "name")
            case "az":
                return queryset.order_by("name")
            case _:
                return queryset.order_by("-created", "name")

    def has_active_filters(self, values):
        return bool(values["q"] or values["status"] != self.filter_all_value or values["sort"] != "new")

    def get_active_filter_labels(self, values):
        labels = []
        if values["q"]:
            labels.append(f'Search: "{values["q"]}"')
        if values["status"] != self.filter_all_value:
            labels.append(f"Status: {dict(self.status_options).get(values['status'], values['status'])}")
        if values["sort"] != "new":
            labels.append(f"Sort: {dict(self.sort_options).get(values['sort'], values['sort'])}")
        return labels


class MemberProductAddView(MemberProductAccessMixin, TemplateView):
    template_name = "members/product_add.html"
    member_title = "Add a new product"

    def get_breadcrumbs(self):
        return (
            {"label": "Home", "url": reverse("home")},
            {"label": "Member", "url": reverse("member_overview")},
            {"label": "Products", "url": reverse("member_products")},
            {"label": "Add", "url": ""},
        )

    def get_form(self):
        return ProductEditForm(self.request.POST or None, self.request.FILES or None, user=self.request.user)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["form"] = kwargs.get("form") or self.get_form()
        return context

    def post(self, request, *args, **kwargs):
        form = self.get_form()
        if form.is_valid():
            try:
                with transaction.atomic():
                    product = form.save()
            except ValidationError as exc:
                form.add_error(None, exc)
            else:
                return redirect("member_product", pk=product.pk)
        return self.render_to_response(self.get_context_data(form=form))


class MemberProductObjectMixin(MemberProductAccessMixin):
    member_title = "Product"

    @cached_property
    def target_product(self):
        return get_object_or_404(self.get_product_queryset(), pk=self.kwargs["pk"])

    @cached_property
    def target_product_platforms(self):
        return [assignment.platform for assignment in self.target_product.platform_assignments.all()]

    @cached_property
    def target_product_categories(self):
        return [assignment.category for assignment in self.target_product.category_assignments.all()]

    @cached_property
    def target_product_use_cases(self):
        return (
            UseCase.objects.filter(categories__product_assignments__product=self.target_product)
            .distinct()
            .order_by("name")
        )

    @cached_property
    def target_product_readiness(self):
        edit_url = reverse("member_product_edit", kwargs={"pk": self.target_product.pk})
        description_length = len((self.target_product.description or self.target_product.summary or "").strip())
        gallery_count = self.target_product.media.count()
        pricing_slug = self.target_product.pricing_model.slug if self.target_product.pricing_model_id else ""
        price_required = pricing_slug in {"subscription", "one-time", "one_time"}
        pricing_complete = bool(self.target_product.pricing_model_id) and (
            not price_required or bool(self.target_product.starting_price_display)
        )
        pricing_note = self.target_product.starting_price_display or str(self.target_product.pricing_model)
        items = (
            {
                "label": "Core details",
                "note": "Name, tagline, and website",
                "complete": all(
                    (
                        self.target_product.name,
                        self.target_product.tagline,
                        self.target_product.website_url,
                    )
                ),
                "href": f"{edit_url}#section-core",
            },
            {
                "label": "Description is strong",
                "note": f"{description_length} chars (aim for 200+)",
                "complete": description_length >= 200,
                "href": f"{edit_url}#section-description",
            },
            {
                "label": "Add gallery images",
                "note": f"{gallery_count}/6 images",
                "complete": gallery_count >= 3,
                "href": f"{edit_url}#section-media",
            },
            {
                "label": "Set hero image",
                "note": "Recommended for stronger presentation",
                "complete": bool(self.target_product.hero_image_url),
                "href": f"{edit_url}#section-media",
            },
            {
                "label": "Categories selected",
                "note": f"{len(self.target_product_categories)} selected",
                "complete": bool(self.target_product_categories),
                "href": f"{edit_url}#section-classification",
            },
            {
                "label": "Pricing is clear",
                "note": pricing_note,
                "complete": pricing_complete,
                "href": f"{edit_url}#section-pricing",
            },
            {
                "label": "Publish listing",
                "note": self.target_product.get_status_display(),
                "complete": self.target_product.status == Product.Status.PUBLISHED and self.target_product.is_listed,
                "href": f"{edit_url}#section-publishing",
            },
        )
        return items

    def get_breadcrumbs(self):
        return (
            {"label": "Home", "url": reverse("home")},
            {"label": "Member", "url": reverse("member_overview")},
            {"label": "Products", "url": reverse("member_products")},
            {"label": self.target_product.name, "url": ""},
        )

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["target_product"] = self.target_product
        context["target_product_initial"] = self.target_product.name[:1].upper()
        context["target_product_categories"] = self.target_product_categories
        context["target_product_platforms"] = self.target_product_platforms
        context["target_product_use_cases"] = self.target_product_use_cases
        context["target_product_media"] = self.target_product.media.all()
        readiness = self.target_product_readiness
        readiness_complete = sum(1 for item in readiness if item["complete"])
        context["target_product_readiness"] = readiness
        context["target_product_readiness_complete"] = readiness_complete
        context["target_product_readiness_total"] = len(readiness)
        context["target_product_readiness_percent"] = round((readiness_complete / len(readiness)) * 100)
        return context


class MemberProductDetailView(MemberProductObjectMixin, TemplateView):
    template_name = "members/product_detail.html"


class MemberProductEditView(MemberProductObjectMixin, TemplateView):
    template_name = "members/product_edit.html"
    member_title = "Editing product"

    def get_breadcrumbs(self):
        return (*super().get_breadcrumbs(), {"label": "Edit", "url": ""})

    def get_form(self):
        return ProductEditForm(
            self.request.POST or None,
            self.request.FILES or None,
            instance=self.target_product,
            user=self.request.user,
        )

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["member_title"] = f"Editing product {self.target_product.name}"
        context["form"] = kwargs.get("form") or self.get_form()
        return context

    def post(self, request, *args, **kwargs):
        form = self.get_form()
        if form.is_valid():
            try:
                with transaction.atomic():
                    product = form.save()
            except ValidationError as exc:
                form.add_error(None, exc)
            else:
                return redirect("member_product", pk=product.pk)
        return self.render_to_response(self.get_context_data(form=form))


class MemberProductDeleteView(MemberProductObjectMixin, TemplateView):
    template_name = "members/product_delete.html"
    member_title = "Delete product"

    def get_breadcrumbs(self):
        return (*super().get_breadcrumbs(), {"label": "Delete", "url": ""})

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["delete_error"] = kwargs.get("delete_error", "")
        return context

    def post(self, request, *args, **kwargs):
        media_urls = product_media_urls(self.target_product)
        try:
            self.target_product.delete()
        except ProtectedError:
            return self.render_to_response(
                self.get_context_data(delete_error="This product is still connected to items that must be moved first.")
            )

        delete_media_urls(media_urls)
        return redirect("member_products")


class MemberProductMediaDeleteView(MemberProductObjectMixin, TemplateView):
    http_method_names = ["post"]

    def post(self, request, *args, **kwargs):
        media = get_object_or_404(ProductMedia, pk=self.kwargs["media_pk"], product=self.target_product)
        media_url = media.url
        media.delete()
        delete_media_urls([media_url])
        return redirect("member_product_edit", pk=self.target_product.pk)


class MemberCategoriesView(MemberSuperuserRequiredMixin, TemplateView):
    template_name = "members/categories.html"
    active_member_nav = "categories"
    member_title = "Categories"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        queryset = (
            Category.objects.select_related("parent")
            .annotate(
                product_count=Count("product_assignments", distinct=True),
                child_count=Count("children", distinct=True),
            )
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
                product_count=Count("product_assignments", distinct=True),
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
            Product.objects.filter(category_assignments__category=self.target_category)
            .select_related("owner", "product_type", "pricing_model")
            .prefetch_related("category_assignments__category")
            .distinct()
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
                product_count=Count("categories__product_assignments__product", distinct=True),
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
                product_count=Count("categories__product_assignments__product", distinct=True),
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
            Product.objects.filter(category_assignments__category__use_cases=self.target_use_case)
            .select_related("owner", "product_type", "pricing_model")
            .prefetch_related("category_assignments__category")
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
        return []

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
                    delete_error="This use case is still connected to items that must be moved first."
                )
            )

        return redirect("member_use_cases")


class MemberFacetConfigMixin:
    model = None
    form_class = None
    table_class = None
    active_member_nav = ""
    member_title = ""
    singular_label = ""
    plural_label = ""
    form_heading = ""
    list_route_name = ""
    detail_route_name = ""
    add_route_name = ""
    edit_route_name = ""
    delete_route_name = ""
    product_count_lookup = "products"
    product_filter_lookup = ""

    def get_facet_queryset(self):
        return self.model.objects.annotate(
            product_count=Count(self.product_count_lookup, distinct=True),
        ).order_by("name")


class MemberFacetListView(MemberFacetConfigMixin, MemberSuperuserRequiredMixin, TemplateView):
    template_name = "members/facet_list.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        queryset = self.get_facet_queryset()
        context["member_facet_count"] = queryset.count()
        context["member_facet_title"] = self.member_title
        context["member_facet_count_label"] = self.singular_label
        context["member_facet_add_url"] = reverse(self.add_route_name)
        context["table"] = self.table_class(queryset).configure(self.request)
        return context


class MemberFacetAddView(MemberFacetConfigMixin, MemberSuperuserRequiredMixin, TemplateView):
    template_name = "members/facet_add.html"

    def get_breadcrumbs(self):
        return (
            {"label": "Home", "url": reverse("home")},
            {"label": "Member", "url": reverse("member_overview")},
            {"label": self.plural_label, "url": reverse(self.list_route_name)},
            {"label": "Add", "url": ""},
        )

    def get_form(self):
        return self.form_class(self.request.POST or None)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["form"] = kwargs.get("form") or self.get_form()
        context["facet_cancel_url"] = reverse(self.list_route_name)
        context["facet_form_heading"] = self.form_heading
        context["facet_submit_label"] = "Create"
        context["facet_tab_label"] = "Create"
        return context

    def post(self, request, *args, **kwargs):
        form = self.get_form()
        if form.is_valid():
            facet = form.save()
            return redirect(self.detail_route_name, pk=facet.pk)
        return self.render_to_response(self.get_context_data(form=form))


class MemberFacetObjectMixin(MemberFacetConfigMixin, MemberSuperuserRequiredMixin):
    @cached_property
    def target_facet(self):
        return get_object_or_404(self.get_facet_queryset(), pk=self.kwargs["pk"])

    def get_breadcrumbs(self):
        return (
            {"label": "Home", "url": reverse("home")},
            {"label": "Member", "url": reverse("member_overview")},
            {"label": self.plural_label, "url": reverse(self.list_route_name)},
            {"label": self.target_facet.name, "url": ""},
        )

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["target_facet"] = self.target_facet
        context["target_facet_initial"] = self.target_facet.name[:1].upper()
        context["facet_singular_label"] = self.singular_label
        context["facet_plural_label"] = self.plural_label
        context["facet_detail_url"] = reverse(self.detail_route_name, kwargs={"pk": self.target_facet.pk})
        context["facet_edit_url"] = reverse(self.edit_route_name, kwargs={"pk": self.target_facet.pk})
        context["facet_delete_url"] = reverse(self.delete_route_name, kwargs={"pk": self.target_facet.pk})
        return context


class MemberFacetDetailView(MemberFacetObjectMixin, TemplateView):
    template_name = "members/facet_detail.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        products = (
            Product.objects.filter(**{self.product_filter_lookup: self.target_facet})
            .select_related("owner", "product_type", "pricing_model")
            .prefetch_related("category_assignments__category")
            .distinct()
            .order_by("-last_updated", "-created", "name")
        )
        context["target_facet_products_table"] = ProductTable(products, show_owner=True).configure(self.request)
        return context


class MemberFacetEditView(MemberFacetObjectMixin, TemplateView):
    template_name = "members/facet_edit.html"

    def get_breadcrumbs(self):
        return (*super().get_breadcrumbs(), {"label": "Edit", "url": ""})

    def get_form(self):
        return self.form_class(self.request.POST or None, instance=self.target_facet)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["member_title"] = f"Editing {self.singular_label} {self.target_facet.name}"
        context["form"] = kwargs.get("form") or self.get_form()
        context["facet_cancel_url"] = reverse(self.detail_route_name, kwargs={"pk": self.target_facet.pk})
        context["facet_form_heading"] = self.form_heading
        context["facet_submit_label"] = "Save"
        context["facet_tab_label"] = "Edit"
        return context

    def post(self, request, *args, **kwargs):
        form = self.get_form()
        if form.is_valid():
            facet = form.save()
            return redirect(self.detail_route_name, pk=facet.pk)
        return self.render_to_response(self.get_context_data(form=form))


class MemberFacetDeleteView(MemberFacetObjectMixin, TemplateView):
    template_name = "members/facet_delete.html"

    def get_breadcrumbs(self):
        return (*super().get_breadcrumbs(), {"label": "Delete", "url": ""})

    def get_delete_blockers(self):
        blockers = []
        if self.target_facet.product_count:
            blockers.append(f"Remove connected products before deleting this {self.singular_label}.")
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
            self.target_facet.delete()
        except ProtectedError:
            return self.render_to_response(
                self.get_context_data(delete_error=f"This {self.singular_label} is still connected to products.")
            )

        return redirect(self.list_route_name)


class ProductTypePageConfig(MemberFacetConfigMixin):
    model = ProductType
    form_class = ProductTypeEditForm
    table_class = ProductTypeTable
    active_member_nav = "product_types"
    member_title = "Product types"
    singular_label = "product type"
    plural_label = "Product types"
    form_heading = "Product type"
    list_route_name = "member_product_types"
    detail_route_name = "member_product_type"
    add_route_name = "member_product_type_add"
    edit_route_name = "member_product_type_edit"
    delete_route_name = "member_product_type_delete"
    product_filter_lookup = "product_type"


class MemberProductTypesView(ProductTypePageConfig, MemberFacetListView):
    pass


class MemberProductTypeAddView(ProductTypePageConfig, MemberFacetAddView):
    member_title = "Add a new product type"


class MemberProductTypeDetailView(ProductTypePageConfig, MemberFacetDetailView):
    member_title = "Product type"


class MemberProductTypeEditView(ProductTypePageConfig, MemberFacetEditView):
    member_title = "Editing product type"


class MemberProductTypeDeleteView(ProductTypePageConfig, MemberFacetDeleteView):
    member_title = "Delete product type"


class PricingModelPageConfig(MemberFacetConfigMixin):
    model = PricingModel
    form_class = PricingModelEditForm
    table_class = PricingModelTable
    active_member_nav = "pricing"
    member_title = "Pricing"
    singular_label = "pricing model"
    plural_label = "Pricing"
    form_heading = "Pricing"
    list_route_name = "member_pricing_models"
    detail_route_name = "member_pricing_model"
    add_route_name = "member_pricing_model_add"
    edit_route_name = "member_pricing_model_edit"
    delete_route_name = "member_pricing_model_delete"
    product_filter_lookup = "pricing_model"


class MemberPricingModelsView(PricingModelPageConfig, MemberFacetListView):
    pass


class MemberPricingModelAddView(PricingModelPageConfig, MemberFacetAddView):
    member_title = "Add pricing"


class MemberPricingModelDetailView(PricingModelPageConfig, MemberFacetDetailView):
    member_title = "Pricing"


class MemberPricingModelEditView(PricingModelPageConfig, MemberFacetEditView):
    member_title = "Editing pricing"


class MemberPricingModelDeleteView(PricingModelPageConfig, MemberFacetDeleteView):
    member_title = "Delete pricing"


class PlatformPageConfig(MemberFacetConfigMixin):
    model = Platform
    form_class = PlatformEditForm
    table_class = PlatformTable
    active_member_nav = "platforms"
    member_title = "Platforms"
    singular_label = "platform"
    plural_label = "Platforms"
    form_heading = "Platform"
    list_route_name = "member_platforms"
    detail_route_name = "member_platform"
    add_route_name = "member_platform_add"
    edit_route_name = "member_platform_edit"
    delete_route_name = "member_platform_delete"
    product_count_lookup = "product_assignments"
    product_filter_lookup = "platform_assignments__platform"


class MemberPlatformsView(PlatformPageConfig, MemberFacetListView):
    pass


class MemberPlatformAddView(PlatformPageConfig, MemberFacetAddView):
    member_title = "Add a new platform"


class MemberPlatformDetailView(PlatformPageConfig, MemberFacetDetailView):
    member_title = "Platform"


class MemberPlatformEditView(PlatformPageConfig, MemberFacetEditView):
    member_title = "Editing platform"


class MemberPlatformDeleteView(PlatformPageConfig, MemberFacetDeleteView):
    member_title = "Delete platform"


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
            .select_related("product_type", "pricing_model")
            .prefetch_related("category_assignments__category")
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
