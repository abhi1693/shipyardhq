from decimal import ROUND_HALF_UP, Decimal

from django import forms
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.utils.text import slugify

from .media_storage import (
    MediaUploadError,
    delete_blob_if_managed,
    upload_product_image,
    validate_image_upload,
)
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

PRICE_REQUIRED_PRICING_SLUGS = {"subscription", "one-time", "one_time"}
PRICE_DISABLED_PRICING_SLUGS = {"free", "custom"}
CURRENCY_CHOICES = (
    ("", "Select currency"),
    ("USD", "USD"),
    ("EUR", "EUR"),
    ("GBP", "GBP"),
    ("CAD", "CAD"),
    ("AUD", "AUD"),
    ("INR", "INR"),
    ("JPY", "JPY"),
    ("CHF", "CHF"),
    ("SGD", "SGD"),
)


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
    starting_price = forms.DecimalField(
        label="Starting price",
        required=False,
        max_digits=10,
        decimal_places=2,
        min_value=Decimal("0.00"),
        widget=forms.NumberInput(
            attrs={
                "class": "member-form-control",
                "data-pricing-price": "",
                "min": "0",
                "step": "0.01",
            }
        ),
    )
    currency_code = forms.ChoiceField(
        label="Currency",
        required=False,
        choices=CURRENCY_CHOICES,
        widget=forms.Select(attrs={"class": "member-form-control member-form-select", "data-pricing-currency": ""}),
    )
    logo_file = forms.FileField(
        label="Logo",
        required=False,
        widget=forms.FileInput(
            attrs={"class": "member-form-control member-form-file", "accept": "image/*", "data-file-input": ""}
        ),
    )
    hero_image_file = forms.FileField(
        label="Hero image",
        required=False,
        widget=forms.FileInput(
            attrs={"class": "member-form-control member-form-file", "accept": "image/*", "data-file-input": ""}
        ),
    )
    media_files = MultipleFileField(
        label="Gallery images",
        required=False,
        widget=MultipleFileInput(
            attrs={
                "class": "member-form-control member-form-file",
                "accept": "image/*",
                "data-gallery-input": "",
                "multiple": True,
            }
        ),
    )
    remove_logo = forms.BooleanField(
        label="Remove current logo",
        required=False,
        widget=forms.CheckboxInput(attrs={"class": "member-form-checkbox"}),
    )
    remove_hero_image = forms.BooleanField(
        label="Remove current hero image",
        required=False,
        widget=forms.CheckboxInput(attrs={"class": "member-form-checkbox"}),
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
            "currency_code",
            "platforms",
            "website_url",
            "summary",
            "description",
        )
        labels = {
            "pricing_model": "Pricing",
            "currency_code": "Currency",
            "product_type": "Type",
            "categories": "Categories",
            "website_url": "Website",
        }
        widgets = {
            "name": forms.TextInput(attrs={"class": "member-form-control", "data-slug-source": "id_slug"}),
            "slug": forms.TextInput(attrs={"class": "member-form-control", "data-slug-target": "id_name"}),
            "tagline": forms.TextInput(attrs={"class": "member-form-control"}),
            "product_type": forms.Select(attrs={"class": "member-form-control member-form-select"}),
            "pricing_model": forms.Select(
                attrs={"class": "member-form-control member-form-select", "data-pricing-model": ""}
            ),
            "website_url": forms.URLInput(attrs={"class": "member-form-control"}),
            "summary": forms.Textarea(attrs={"class": "member-form-control member-form-textarea", "rows": 4}),
            "description": forms.Textarea(attrs={"class": "member-form-control member-form-textarea", "rows": 6}),
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

        if self.instance.pk and self.instance.starting_price_cents is not None:
            self.fields["starting_price"].initial = Decimal(self.instance.starting_price_cents) / Decimal("100")
            self.fields["currency_code"].initial = self.instance.currency_code

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

    def clean(self):
        cleaned_data = super().clean()
        pricing_model = cleaned_data.get("pricing_model")
        starting_price = cleaned_data.get("starting_price")
        currency_code = cleaned_data.get("currency_code", "")
        pricing_slug = pricing_model.slug if pricing_model else ""

        if pricing_slug in PRICE_DISABLED_PRICING_SLUGS:
            cleaned_data["starting_price"] = None
            cleaned_data["currency_code"] = ""

        if pricing_slug in PRICE_REQUIRED_PRICING_SLUGS and starting_price is None:
            self.add_error("starting_price", "Starting price is required for this pricing model.")

        if starting_price is not None and not currency_code:
            self.add_error("currency_code", "Select a currency.")
        elif currency_code and starting_price is None:
            self.add_error("starting_price", "Enter a starting price.")

        if currency_code:
            cleaned_data["currency_code"] = currency_code.upper()

        return cleaned_data

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
        self._sync_pricing(product)
        self._sync_workflow_status(product)
        self._sync_status_dates(product)

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

    def _sync_pricing(self, product):
        starting_price = self.cleaned_data.get("starting_price")
        currency_code = self.cleaned_data.get("currency_code", "")
        pricing_slug = product.pricing_model.slug if product.pricing_model_id else ""

        if pricing_slug in PRICE_DISABLED_PRICING_SLUGS:
            product.starting_price_cents = None
            product.currency_code = ""
            return

        if starting_price is None:
            product.starting_price_cents = None
            product.currency_code = ""
            return

        product.starting_price_cents = int((starting_price * Decimal("100")).quantize(Decimal("1"), ROUND_HALF_UP))
        product.currency_code = currency_code.upper()

    def _sync_workflow_status(self, product):
        if not product.pk:
            product.status = Product.Status.REVIEW
        elif product.status == Product.Status.PUBLISHED and not product.can_publish:
            product.status = Product.Status.REVIEW

    def _sync_status_dates(self, product):
        now = timezone.now()
        if product.status == Product.Status.PUBLISHED and not product.published_at:
            product.published_at = now
        elif product.status != Product.Status.PUBLISHED:
            product.published_at = None

        if product.status == Product.Status.REVIEW and not product.submitted_at:
            product.submitted_at = now

        if product.status == Product.Status.ARCHIVED and not product.archived_at:
            product.archived_at = now
        elif product.status != Product.Status.ARCHIVED:
            product.archived_at = None

    def _sync_media(self, product):
        changed_fields = []

        for form_field, model_field, folder in (
            ("logo_file", "logo_url", "logo"),
            ("hero_image_file", "hero_image_url", "hero"),
        ):
            uploaded_file = self.cleaned_data.get(form_field)
            old_url = getattr(product, model_field)
            remove_field = "remove_logo" if model_field == "logo_url" else "remove_hero_image"

            if uploaded_file:
                try:
                    url, _prepared = upload_product_image(product, uploaded_file, folder)
                except MediaUploadError as exc:
                    raise forms.ValidationError("Media uploads are not available right now.") from exc
                setattr(product, model_field, url)
                changed_fields.append(model_field)
                delete_blob_if_managed(old_url)
            elif old_url and self.cleaned_data.get(remove_field):
                setattr(product, model_field, "")
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
