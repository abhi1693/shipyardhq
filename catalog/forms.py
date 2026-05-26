from django import forms
from django.contrib.auth import get_user_model
from django.utils.text import slugify

from .models import (
    Category,
    Platform,
    PricingModel,
    Product,
    ProductPlatformAssignment,
    ProductType,
    ProductUseCaseAssignment,
    UseCase,
)

User = get_user_model()


class CategoryEditForm(forms.ModelForm):
    class Meta:
        model = Category
        fields = ("name", "slug", "icon", "parent", "description", "is_active")
        labels = {
            "is_active": "Active",
        }
        widgets = {
            "name": forms.TextInput(attrs={"class": "member-form-control", "data-slug-source": "id_slug"}),
            "slug": forms.TextInput(attrs={"class": "member-form-control", "data-slug-target": "id_name"}),
            "icon": forms.Select(attrs={"class": "member-form-control member-form-select", "autocomplete": "off"}),
            "parent": forms.Select(attrs={"class": "member-form-control member-form-select", "autocomplete": "off"}),
            "description": forms.Textarea(attrs={"class": "member-form-control member-form-textarea", "rows": 5}),
            "is_active": forms.CheckboxInput(attrs={"class": "member-form-checkbox"}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        parent_queryset = Category.objects.order_by("name")
        if self.instance.pk:
            parent_queryset = parent_queryset.exclude(pk=self.instance.pk)
        self.fields["parent"].queryset = parent_queryset
        self.fields["parent"].empty_label = "None"


class UseCaseEditForm(forms.ModelForm):
    categories = forms.ModelMultipleChoiceField(
        queryset=Category.objects.none(),
        required=False,
        widget=forms.SelectMultiple(attrs={"class": "member-form-control member-form-multiselect"}),
    )

    class Meta:
        model = UseCase
        fields = ("name", "slug", "categories", "description", "is_active")
        labels = {
            "is_active": "Active",
        }
        widgets = {
            "name": forms.TextInput(attrs={"class": "member-form-control", "data-slug-source": "id_slug"}),
            "slug": forms.TextInput(attrs={"class": "member-form-control", "data-slug-target": "id_name"}),
            "description": forms.Textarea(attrs={"class": "member-form-control member-form-textarea", "rows": 5}),
            "is_active": forms.CheckboxInput(attrs={"class": "member-form-checkbox"}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["categories"].queryset = Category.objects.order_by("name")
        if self.instance.pk:
            self.fields["categories"].initial = self.instance.categories.all()

    def save(self, commit=True):
        use_case = super().save(commit=commit)
        if commit:
            use_case.categories.set(self.cleaned_data["categories"])
        return use_case


class ProductTypeEditForm(forms.ModelForm):
    class Meta:
        model = ProductType
        fields = ("name", "slug", "description", "is_active")
        labels = {
            "is_active": "Active",
        }
        widgets = {
            "name": forms.TextInput(attrs={"class": "member-form-control", "data-slug-source": "id_slug"}),
            "slug": forms.TextInput(attrs={"class": "member-form-control", "data-slug-target": "id_name"}),
            "description": forms.Textarea(attrs={"class": "member-form-control member-form-textarea", "rows": 5}),
            "is_active": forms.CheckboxInput(attrs={"class": "member-form-checkbox"}),
        }


class PricingModelEditForm(forms.ModelForm):
    class Meta:
        model = PricingModel
        fields = ("name", "slug", "description", "is_active")
        labels = {
            "is_active": "Active",
        }
        widgets = {
            "name": forms.TextInput(attrs={"class": "member-form-control", "data-slug-source": "id_slug"}),
            "slug": forms.TextInput(attrs={"class": "member-form-control", "data-slug-target": "id_name"}),
            "description": forms.Textarea(attrs={"class": "member-form-control member-form-textarea", "rows": 5}),
            "is_active": forms.CheckboxInput(attrs={"class": "member-form-checkbox"}),
        }


class PlatformEditForm(forms.ModelForm):
    class Meta:
        model = Platform
        fields = ("name", "slug", "description", "is_active")
        labels = {
            "is_active": "Active",
        }
        widgets = {
            "name": forms.TextInput(attrs={"class": "member-form-control", "data-slug-source": "id_slug"}),
            "slug": forms.TextInput(attrs={"class": "member-form-control", "data-slug-target": "id_name"}),
            "description": forms.Textarea(attrs={"class": "member-form-control member-form-textarea", "rows": 5}),
            "is_active": forms.CheckboxInput(attrs={"class": "member-form-checkbox"}),
        }


class ProductEditForm(forms.ModelForm):
    owner = forms.ModelChoiceField(
        queryset=User.objects.none(),
        label="Builder",
        widget=forms.Select(attrs={"class": "member-form-control member-form-select"}),
    )
    platforms = forms.ModelMultipleChoiceField(
        queryset=Platform.objects.none(),
        required=False,
        widget=forms.SelectMultiple(attrs={"class": "member-form-control member-form-multiselect"}),
    )
    use_cases = forms.ModelMultipleChoiceField(
        queryset=UseCase.objects.none(),
        required=False,
        widget=forms.SelectMultiple(attrs={"class": "member-form-control member-form-multiselect"}),
    )

    class Meta:
        model = Product
        fields = (
            "owner",
            "name",
            "slug",
            "tagline",
            "category",
            "product_type",
            "pricing_model",
            "platforms",
            "use_cases",
            "website_url",
            "logo_url",
            "hero_image_url",
            "summary",
            "description",
            "status",
            "is_listed",
        )
        labels = {
            "is_listed": "Listed",
            "pricing_model": "Pricing",
            "product_type": "Type",
            "website_url": "Website",
            "logo_url": "Logo URL",
            "hero_image_url": "Hero image URL",
        }
        widgets = {
            "name": forms.TextInput(attrs={"class": "member-form-control", "data-slug-source": "id_slug"}),
            "slug": forms.TextInput(attrs={"class": "member-form-control", "data-slug-target": "id_name"}),
            "tagline": forms.TextInput(attrs={"class": "member-form-control"}),
            "category": forms.Select(attrs={"class": "member-form-control member-form-select"}),
            "product_type": forms.Select(attrs={"class": "member-form-control member-form-select"}),
            "pricing_model": forms.Select(attrs={"class": "member-form-control member-form-select"}),
            "website_url": forms.URLInput(attrs={"class": "member-form-control"}),
            "logo_url": forms.URLInput(attrs={"class": "member-form-control"}),
            "hero_image_url": forms.URLInput(attrs={"class": "member-form-control"}),
            "summary": forms.Textarea(attrs={"class": "member-form-control member-form-textarea", "rows": 4}),
            "description": forms.Textarea(attrs={"class": "member-form-control member-form-textarea", "rows": 6}),
            "status": forms.Select(attrs={"class": "member-form-control member-form-select"}),
            "is_listed": forms.CheckboxInput(attrs={"class": "member-form-checkbox"}),
        }

    def __init__(self, *args, user, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = user
        self.fields["category"].queryset = Category.objects.order_by("name")
        self.fields["category"].empty_label = "Select a category"
        self.fields["product_type"].queryset = ProductType.objects.order_by("name")
        self.fields["product_type"].empty_label = "Select a type"
        self.fields["pricing_model"].queryset = PricingModel.objects.order_by("name")
        self.fields["pricing_model"].empty_label = "Select pricing"
        self.fields["platforms"].queryset = Platform.objects.order_by("name")
        self.fields["use_cases"].queryset = UseCase.objects.order_by("name")

        if user.is_superuser:
            self.fields["owner"].queryset = User.objects.filter(is_active=True).order_by("email")
            if not self.instance.pk:
                self.fields["owner"].initial = user
        else:
            self.fields.pop("owner")
            self.fields.pop("slug")

        if self.instance.pk:
            self.fields["platforms"].initial = Platform.objects.filter(product_assignments__product=self.instance)
            self.fields["use_cases"].initial = UseCase.objects.filter(product_assignments__product=self.instance)

    def save(self, commit=True):
        product = super().save(commit=False)
        if "owner" not in self.fields and not product.pk:
            product.owner = self.user
        if "slug" not in self.fields:
            product.slug = self.instance.slug if self.instance.pk else self._generate_unique_slug(product.name)

        if commit:
            product.save()
            self._sync_platforms(product)
            self._sync_use_cases(product)

        return product

    def _generate_unique_slug(self, name):
        base_slug = slugify(name) or "product"
        slug = base_slug
        counter = 2
        while Product.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        return slug

    def _sync_platforms(self, product):
        ProductPlatformAssignment.objects.filter(product=product).delete()
        ProductPlatformAssignment.objects.bulk_create([
            ProductPlatformAssignment(product=product, platform=platform)
            for platform in self.cleaned_data["platforms"]
        ])

    def _sync_use_cases(self, product):
        ProductUseCaseAssignment.objects.filter(product=product).delete()
        ProductUseCaseAssignment.objects.bulk_create([
            ProductUseCaseAssignment(product=product, use_case=use_case)
            for use_case in self.cleaned_data["use_cases"]
        ])
