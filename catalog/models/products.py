from decimal import Decimal

from django.conf import settings
from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVectorField
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from core.models import ChangeLoggedModel, PrimaryModel


class ProductQuerySet(models.QuerySet):
    def published(self):
        return self.filter(status=Product.Status.PUBLISHED, published_at__lte=timezone.now())

    def visible(self):
        return self.filter(is_listed=True).published()


class Product(PrimaryModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        REVIEW = "review", "In review"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="products", on_delete=models.PROTECT)
    product_type = models.ForeignKey("catalog.ProductType", related_name="products", on_delete=models.PROTECT)
    pricing_model = models.ForeignKey("catalog.PricingModel", related_name="products", on_delete=models.PROTECT)
    name = models.CharField(max_length=160)
    slug = models.SlugField(unique=True)
    tagline = models.CharField(max_length=220)
    summary = models.TextField(blank=True)
    description = models.TextField(blank=True)
    website_url = models.URLField()
    logo_url = models.URLField(blank=True)
    hero_image_url = models.URLField(blank=True)
    starting_price_cents = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
    )
    currency_code = models.CharField(max_length=3, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT)
    is_listed = models.BooleanField(default=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    search_document = SearchVectorField(null=True, editable=False)

    objects = ProductQuerySet.as_manager()

    class Meta:
        ordering = ("-published_at", "-created", "name")
        indexes = [
            models.Index(fields=("status", "published_at")),
            models.Index(fields=("is_listed", "status", "published_at")),
            models.Index(fields=("pricing_model", "status", "published_at")),
            models.Index(fields=("product_type", "status", "published_at")),
            GinIndex(fields=("search_document",)),
        ]

    def __str__(self):
        return self.name

    @property
    def starting_price_amount(self):
        if self.starting_price_cents is None:
            return None
        return Decimal(self.starting_price_cents) / Decimal("100")

    @property
    def starting_price_display(self):
        amount = self.starting_price_amount
        if amount is None or not self.currency_code:
            return ""
        return f"{self.currency_code} {amount:.2f}"


class ProductAlternativeAssignment(ChangeLoggedModel):
    product = models.ForeignKey("catalog.Product", related_name="alternative_assignments", on_delete=models.CASCADE)
    alternative = models.ForeignKey(
        "catalog.Product",
        related_name="alternative_for_assignments",
        on_delete=models.CASCADE,
    )
    reason = models.CharField(max_length=220, blank=True)

    class Meta:
        ordering = ("product", "alternative", "pk")
        indexes = [
            models.Index(fields=("product", "alternative", "id")),
            models.Index(fields=("alternative", "product")),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=("product", "alternative"),
                name="%(app_label)s_%(class)s_unique_product_alternative",
            ),
            models.CheckConstraint(
                condition=~models.Q(product=models.F("alternative")),
                name="%(app_label)s_%(class)s_prevent_self_alternative",
            ),
        ]

    def __str__(self):
        return f"{self.alternative} alternative to {self.product}"


class ProductCategoryAssignment(ChangeLoggedModel):
    product = models.ForeignKey("catalog.Product", related_name="category_assignments", on_delete=models.CASCADE)
    category = models.ForeignKey("catalog.Category", related_name="product_assignments", on_delete=models.PROTECT)

    class Meta:
        ordering = ("category", "product", "pk")
        indexes = [
            models.Index(fields=("category", "product", "id")),
            models.Index(fields=("product", "category")),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=("product", "category"),
                name="%(app_label)s_%(class)s_unique_product_category",
            ),
        ]

    def __str__(self):
        return f"{self.product}: {self.category}"


class ProductLink(ChangeLoggedModel):
    class LinkType(models.TextChoices):
        WEBSITE = "website", "Website"
        DOCS = "docs", "Docs"
        SUPPORT = "support", "Support"
        SOCIAL = "social", "Social"
        OTHER = "other", "Other"

    product = models.ForeignKey("catalog.Product", related_name="links", on_delete=models.CASCADE)
    link_type = models.CharField(max_length=16, choices=LinkType.choices, default=LinkType.WEBSITE)
    label = models.CharField(max_length=80, blank=True)
    url = models.URLField()
    is_primary = models.BooleanField(default=False)

    class Meta:
        ordering = ("product", "-is_primary", "link_type", "label", "pk")
        indexes = [
            models.Index(fields=("product", "link_type", "is_primary", "id")),
        ]

    def __str__(self):
        return self.label or self.url


class ProductMedia(ChangeLoggedModel):
    class MediaType(models.TextChoices):
        LOGO = "logo", "Logo"
        IMAGE = "image", "Image"
        VIDEO = "video", "Video"

    product = models.ForeignKey("catalog.Product", related_name="media", on_delete=models.CASCADE)
    media_type = models.CharField(max_length=16, choices=MediaType.choices, default=MediaType.IMAGE)
    url = models.URLField()
    alt_text = models.CharField(max_length=220, blank=True)
    width = models.PositiveIntegerField(null=True, blank=True, validators=[MinValueValidator(1)])
    height = models.PositiveIntegerField(null=True, blank=True, validators=[MinValueValidator(1)])

    class Meta:
        ordering = ("product", "media_type", "created", "pk")
        indexes = [
            models.Index(fields=("product", "media_type", "created", "id")),
        ]

    def __str__(self):
        return f"{self.product} {self.media_type}"


class ProductPlatformAssignment(ChangeLoggedModel):
    product = models.ForeignKey("catalog.Product", related_name="platform_assignments", on_delete=models.CASCADE)
    platform = models.ForeignKey("catalog.Platform", related_name="product_assignments", on_delete=models.PROTECT)

    class Meta:
        ordering = ("platform", "product", "pk")
        indexes = [
            models.Index(fields=("platform", "product", "id")),
            models.Index(fields=("product", "platform")),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=("product", "platform"),
                name="%(app_label)s_%(class)s_unique_product_platform",
            ),
        ]

    def __str__(self):
        return f"{self.product}: {self.platform}"
