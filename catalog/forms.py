from django import forms
from django.contrib.auth import get_user_model
from django.utils.text import slugify

from .media_storage import MediaUploadError, delete_blob_if_managed, upload_product_image, validate_image_upload
from .models import (
    Category,
    Platform,
    PricingModel,
    Product,
    ProductCategoryAssignment,
    ProductMedia,
    ProductPlatformAssignment,
    ProductType,
    UseCase,
)

User = get_user_model()


class MultipleFileInput(forms.ClearableFileInput):
    allow_multiple_selected = True


class MultipleFileField(forms.FileField):
    widget = MultipleFileInput

    def clean(self, data, initial=None):
        if not data:
            return []

        files = data if isinstance(data, (list, tuple)) else [data]
        cleaned_files = []
        for item in files:
            if item:
                cleaned_files.append(super().clean(item, initial))
        return cleaned_files


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
    categories = forms.ModelMultipleChoiceField(
        queryset=Category.objects.none(),
        widget=forms.SelectMultiple(attrs={"class": "member-form-control member-form-multiselect"}),
    )
    platforms = forms.ModelMultipleChoiceField(
        queryset=Platform.objects.none(),
        required=False,
        widget=forms.SelectMultiple(attrs={"class": "member-form-control member-form-multiselect"}),
    )
    logo_file = forms.FileField(
        label="Logo",
        required=False,
        widget=forms.FileInput(attrs={"class": "member-form-control member-form-file", "accept": "image/*"}),
    )
    hero_image_file = forms.FileField(
        label="Hero image",
        required=False,
        widget=forms.FileInput(attrs={"class": "member-form-control member-form-file", "accept": "image/*"}),
    )
    media_files = MultipleFileField(
        label="Gallery images",
        required=False,
        widget=MultipleFileInput(
            attrs={
                "class": "member-form-control member-form-file",
                "accept": "image/*",
                "multiple": True,
            }
        ),
    )

    class Meta:
        model = Product
        fields = (
            "owner",
            "name",
            "slug",
            "tagline",
            "categories",
            "product_type",
            "pricing_model",
            "platforms",
            "website_url",
            "summary",
            "description",
            "status",
            "is_listed",
        )
        labels = {
            "is_listed": "Listed",
            "pricing_model": "Pricing",
            "product_type": "Type",
            "categories": "Categories",
            "website_url": "Website",
        }
        widgets = {
            "name": forms.TextInput(attrs={"class": "member-form-control", "data-slug-source": "id_slug"}),
            "slug": forms.TextInput(attrs={"class": "member-form-control", "data-slug-target": "id_name"}),
            "tagline": forms.TextInput(attrs={"class": "member-form-control"}),
            "product_type": forms.Select(attrs={"class": "member-form-control member-form-select"}),
            "pricing_model": forms.Select(attrs={"class": "member-form-control member-form-select"}),
            "website_url": forms.URLInput(attrs={"class": "member-form-control"}),
            "summary": forms.Textarea(attrs={"class": "member-form-control member-form-textarea", "rows": 4}),
            "description": forms.Textarea(attrs={"class": "member-form-control member-form-textarea", "rows": 6}),
            "status": forms.Select(attrs={"class": "member-form-control member-form-select"}),
            "is_listed": forms.CheckboxInput(attrs={"class": "member-form-checkbox"}),
        }

    def __init__(self, *args, user, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = user
        self.fields["categories"].queryset = Category.objects.order_by("name")
        self.fields["product_type"].queryset = ProductType.objects.order_by("name")
        self.fields["product_type"].empty_label = "Select a type"
        self.fields["pricing_model"].queryset = PricingModel.objects.order_by("name")
        self.fields["pricing_model"].empty_label = "Select pricing"
        self.fields["platforms"].queryset = Platform.objects.order_by("name")

        if user.is_superuser:
            self.fields["owner"].queryset = User.objects.filter(is_active=True).order_by("email")
            if not self.instance.pk:
                self.fields["owner"].initial = user
        else:
            self.fields.pop("owner")
            self.fields.pop("slug")

        if self.instance.pk:
            self.fields["categories"].initial = Category.objects.filter(product_assignments__product=self.instance)
            self.fields["platforms"].initial = Platform.objects.filter(product_assignments__product=self.instance)

    def clean_logo_file(self):
        uploaded_file = self.cleaned_data["logo_file"]
        if uploaded_file:
            validate_image_upload(uploaded_file)
        return uploaded_file

    def clean_hero_image_file(self):
        uploaded_file = self.cleaned_data["hero_image_file"]
        if uploaded_file:
            validate_image_upload(uploaded_file)
        return uploaded_file

    def clean_media_files(self):
        uploaded_files = self.cleaned_data["media_files"]
        existing_count = self.instance.media.count() if self.instance.pk else 0
        if existing_count + len(uploaded_files) > 6:
            raise forms.ValidationError("A product can have up to 6 gallery images.")

        for uploaded_file in uploaded_files:
            validate_image_upload(uploaded_file)
        return uploaded_files

    def save(self, commit=True):
        product = super().save(commit=False)
        if "owner" not in self.fields and not product.pk:
            product.owner = self.user
        if "slug" not in self.fields:
            product.slug = self.instance.slug if self.instance.pk else self._generate_unique_slug(product.name)

        if commit:
            product.save()
            self._sync_categories(product)
            self._sync_platforms(product)
            self._sync_media(product)

        return product

    def _generate_unique_slug(self, name):
        base_slug = slugify(name) or "product"
        slug = base_slug
        counter = 2
        while Product.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        return slug

    def _sync_categories(self, product):
        ProductCategoryAssignment.objects.filter(product=product).delete()
        ProductCategoryAssignment.objects.bulk_create([
            ProductCategoryAssignment(product=product, category=category)
            for category in self.cleaned_data["categories"]
        ])

    def _sync_platforms(self, product):
        ProductPlatformAssignment.objects.filter(product=product).delete()
        ProductPlatformAssignment.objects.bulk_create([
            ProductPlatformAssignment(product=product, platform=platform)
            for platform in self.cleaned_data["platforms"]
        ])

    def _sync_media(self, product):
        changed_fields = []

        for form_field, model_field, folder in (
            ("logo_file", "logo_url", "logo"),
            ("hero_image_file", "hero_image_url", "hero"),
        ):
            uploaded_file = self.cleaned_data.get(form_field)
            if not uploaded_file:
                continue

            old_url = getattr(product, model_field)
            try:
                url, _prepared = upload_product_image(product, uploaded_file, folder)
            except MediaUploadError as exc:
                raise forms.ValidationError("Media uploads are not available right now.") from exc
            setattr(product, model_field, url)
            changed_fields.append(model_field)
            delete_blob_if_managed(old_url)

        if changed_fields:
            product.save(update_fields=[*changed_fields, "last_updated"])

        media_records = []
        for uploaded_file in self.cleaned_data.get("media_files", []):
            try:
                url, prepared = upload_product_image(product, uploaded_file, "media")
            except MediaUploadError as exc:
                raise forms.ValidationError("Media uploads are not available right now.") from exc
            media_records.append(
                ProductMedia(
                    product=product,
                    media_type=ProductMedia.MediaType.IMAGE,
                    url=url,
                    alt_text=product.name,
                    width=prepared.width,
                    height=prepared.height,
                )
            )

        if media_records:
            ProductMedia.objects.bulk_create(media_records)
