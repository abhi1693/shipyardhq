from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import F, Q
from django.urls import reverse
from django.utils import timezone
from django.utils.text import slugify

from core.models import ChangeLoggedModel, OrganizationalModel, PrimaryModel


def _normalize_text_list(values, *, allowed=None):
    normalized = []
    seen = set()
    for raw_value in values or []:
        value = str(raw_value).strip().lower()
        if not value:
            continue
        if allowed and value not in allowed:
            continue
        if value in seen:
            continue
        seen.add(value)
        normalized.append(value)
    return normalized


class SluggedOrganizationalModel(OrganizationalModel):
    slug = models.SlugField(max_length=160, unique=True, blank=True)

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if not self.slug and self.name:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class NamedPrimaryModel(PrimaryModel):
    name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=160, unique=True, blank=True)

    class Meta:
        abstract = True
        ordering = ("name",)

    def save(self, *args, **kwargs):
        if not self.slug and self.name:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name


class Category(SluggedOrganizationalModel):
    hero_title = models.CharField(max_length=160, blank=True)
    seo_summary = models.CharField(max_length=260, blank=True)

    def get_absolute_url(self):
        return reverse("public:category-detail", args=[self.slug])


class UseCase(SluggedOrganizationalModel):
    hero_title = models.CharField(max_length=160, blank=True)

    def get_absolute_url(self):
        return reverse("public:use-case-detail", args=[self.slug])


class Tag(SluggedOrganizationalModel):
    def get_absolute_url(self):
        return reverse("public:tag-detail", args=[self.slug])


class Plan(SluggedOrganizationalModel):
    class PlanType(models.TextChoices):
        FREE = "free", "Free"
        PAID = "paid", "Paid"
        ENTERPRISE = "enterprise", "Enterprise"

    class TimeInterval(models.TextChoices):
        MONTH = "month", "Month"
        YEAR = "year", "Year"
        LIFETIME = "lifetime", "Lifetime"

    plan_type = models.CharField(max_length=20, choices=PlanType.choices, default=PlanType.PAID)
    interval = models.CharField(
        max_length=20, choices=TimeInterval.choices, default=TimeInterval.MONTH
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=10, default="USD")
    is_public = models.BooleanField(default=True)

    def get_absolute_url(self):
        return reverse("public:pricing-detail", args=[self.slug])


class PlanFeature(SluggedOrganizationalModel):
    class Category(models.TextChoices):
        VISIBILITY = "visibility", "Visibility"
        ANALYTICS = "analytics", "Analytics"
        TRUST = "trust", "Trust"
        GROWTH = "growth", "Growth"

    category = models.CharField(
        max_length=30, choices=Category.choices, default=Category.VISIBILITY
    )
    feature_key = models.CharField(max_length=100, unique=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.feature_key:
            self.feature_key = self.slug or slugify(self.name)
        super().save(*args, **kwargs)


class Product(NamedPrimaryModel):
    class ProductType(models.TextChoices):
        SAAS = "saas", "SaaS"
        API = "api", "API"
        SERVICE = "service", "Service"
        COMMUNITY = "community", "Community"

    class PricingModel(models.TextChoices):
        FREE = "free", "Free"
        FREEMIUM = "freemium", "Freemium"
        PAID = "paid", "Paid"
        CUSTOM = "custom", "Custom"

    class ProductStatus(models.TextChoices):
        DRAFT = "draft", "Draft"
        REVIEW = "review", "Review"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    class Platform(models.TextChoices):
        WEB = "web", "Web"
        IOS = "ios", "iOS"
        ANDROID = "android", "Android"
        DESKTOP = "desktop", "Desktop"
        API = "api", "API"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="products",
    )
    tagline = models.CharField(max_length=180, blank=True)
    website_url = models.URLField(blank=True)
    logo_url = models.URLField(blank=True)
    banner_image_url = models.URLField(blank=True)
    product_type = models.CharField(
        max_length=20, choices=ProductType.choices, default=ProductType.SAAS
    )
    pricing_model = models.CharField(
        max_length=20,
        choices=PricingModel.choices,
        default=PricingModel.FREEMIUM,
    )
    status = models.CharField(
        max_length=20, choices=ProductStatus.choices, default=ProductStatus.DRAFT
    )
    platform = models.CharField(max_length=20, choices=Platform.choices, default=Platform.WEB)
    platforms = models.JSONField(default=list, blank=True)
    keywords = models.JSONField(default=list, blank=True)
    plan = models.ForeignKey(
        Plan,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
    )
    external_subscription_id = models.CharField(max_length=160, null=True, blank=True, unique=True)
    plan_assigned_at = models.DateTimeField(null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    starting_price_cents = models.PositiveIntegerField(default=0)
    currency_code = models.CharField(max_length=10, default="USD")
    categories = models.ManyToManyField(Category, blank=True, related_name="products")
    use_cases = models.ManyToManyField(UseCase, blank=True, related_name="products")
    tags = models.ManyToManyField(Tag, blank=True, related_name="products")
    featured = models.BooleanField(default=False)
    launched_on = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ("name",)
        indexes = [
            models.Index(fields=("status", "name")),
            models.Index(fields=("owner", "status")),
        ]

    def clean(self):
        super().clean()
        if self.pricing_model == self.PricingModel.FREE and self.starting_price_cents:
            raise ValidationError(
                {"starting_price_cents": "Free products must not carry a starting price."}
            )
        if self.status == self.ProductStatus.PUBLISHED and not self.website_url:
            raise ValidationError(
                {"website_url": "Published products require a public website URL."}
            )

    def save(self, *args, **kwargs):
        allowed_platforms = set(self.Platform.values)
        normalized_platforms = _normalize_text_list(self.platforms, allowed=allowed_platforms)
        if self.platform and self.platform not in normalized_platforms:
            normalized_platforms.insert(0, self.platform)
        self.platforms = normalized_platforms or [self.platform]
        self.keywords = _normalize_text_list(self.keywords)
        if self.status == self.ProductStatus.PUBLISHED and not self.published_at:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)

    def get_absolute_url(self):
        return reverse("public:product-detail", args=[self.slug])


class ProductMetadata(ChangeLoggedModel):
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name="metadata")
    headquarters = models.CharField(max_length=120, blank=True)
    founder_name = models.CharField(max_length=120, blank=True)
    support_email = models.EmailField(blank=True)
    support_url = models.URLField(blank=True)
    pricing_page_url = models.URLField(blank=True)
    setup_time = models.CharField(max_length=80, blank=True)
    founded_year = models.PositiveSmallIntegerField(null=True, blank=True)
    team_size = models.PositiveIntegerField(null=True, blank=True)
    integrations = models.JSONField(default=list, blank=True)

    def __str__(self) -> str:
        return f"Metadata for {self.product}"


class ProductVerification(ChangeLoggedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        VERIFIED = "verified", "Verified"
        EXPIRED = "expired", "Expired"
        REJECTED = "rejected", "Rejected"

    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name="verification")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verified_products",
    )
    evidence_url = models.URLField(blank=True)
    notes = models.TextField(blank=True)

    def save(self, *args, **kwargs):
        if self.status == self.Status.VERIFIED and not self.verified_at:
            self.verified_at = timezone.now()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.product} verification"


class ProductMedia(ChangeLoggedModel):
    class Kind(models.TextChoices):
        IMAGE = "image", "Image"
        VIDEO = "video", "Video"
        LOGO = "logo", "Logo"

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="media")
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.IMAGE)
    title = models.CharField(max_length=150)
    asset_url = models.URLField()
    sort_order = models.PositiveIntegerField(default=0)
    is_primary = models.BooleanField(default=False)

    class Meta:
        ordering = ("sort_order", "title")
        constraints = [
            models.UniqueConstraint(
                fields=("product",),
                condition=Q(is_primary=True),
                name="unique_primary_media_per_product",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.product} · {self.title}"


class ProductAnalytics(ChangeLoggedModel):
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name="analytics")
    monthly_visitors = models.PositiveIntegerField(default=0)
    monthly_signups = models.PositiveIntegerField(default=0)
    monthly_pageviews = models.PositiveIntegerField(default=0)
    verified_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    average_rating = models.DecimalField(max_digits=4, decimal_places=2, default=0)

    def __str__(self) -> str:
        return f"Analytics for {self.product}"


class AlternativeProduct(NamedPrimaryModel):
    summary = models.CharField(max_length=220, blank=True)
    website_url = models.URLField(blank=True)
    logo_url = models.URLField(blank=True)
    products = models.ManyToManyField(Product, blank=True, related_name="alternative_products")
    categories = models.ManyToManyField(Category, blank=True, related_name="alternative_products")

    def get_absolute_url(self):
        return reverse("public:alternative-detail", args=[self.slug])


class ProductClaimAttempt(ChangeLoggedModel):
    class Method(models.TextChoices):
        EMAIL = "email", "Email"
        DOMAIN = "domain", "Domain"
        PAYMENT = "payment", "Payment"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="claim_attempts")
    claimant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="product_claim_attempts",
    )
    method = models.CharField(max_length=20, choices=Method.choices, default=Method.EMAIL)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    proof_url = models.URLField(blank=True)
    notes = models.TextField(blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_product_claim_attempts",
    )

    class Meta:
        ordering = ("-created_at",)

    def clean(self):
        super().clean()
        if self.method in {self.Method.DOMAIN, self.Method.PAYMENT} and not self.proof_url:
            raise ValidationError({"proof_url": "This claim method requires proof."})

    def __str__(self) -> str:
        return f"{self.claimant} claiming {self.product}"


class ProductBadge(ChangeLoggedModel):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="badges")
    label = models.CharField(max_length=120)
    description = models.CharField(max_length=220, blank=True)
    color_token = models.CharField(max_length=40, default="steel")
    active_from = models.DateField(null=True, blank=True)
    active_until = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ("label",)
        constraints = [
            models.CheckConstraint(
                condition=Q(active_from__isnull=True)
                | Q(active_until__isnull=True)
                | Q(active_until__gte=F("active_from")),
                name="product_badge_date_range_valid",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.product} · {self.label}"


class ProductUpvote(ChangeLoggedModel):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="upvotes")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="product_upvotes",
    )

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(fields=("product", "user"), name="unique_product_upvote"),
        ]

    def __str__(self) -> str:
        return f"{self.user} upvoted {self.product}"


class MemberFeedback(ChangeLoggedModel):
    class Status(models.TextChoices):
        NEW = "new", "New"
        REVIEWING = "reviewing", "Reviewing"
        RESOLVED = "resolved", "Resolved"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="feedback"
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="feedback",
    )
    subject = models.CharField(max_length=160)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return self.subject


class UseCaseCategory(ChangeLoggedModel):
    use_case = models.ForeignKey(
        UseCase, on_delete=models.CASCADE, related_name="category_assignments"
    )
    category = models.ForeignKey(
        Category, on_delete=models.CASCADE, related_name="use_case_assignments"
    )
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ("sort_order", "category__name")
        constraints = [
            models.UniqueConstraint(
                fields=("use_case", "category"), name="unique_use_case_category"
            ),
        ]

    def __str__(self) -> str:
        return f"{self.use_case} → {self.category}"


class PlanFeatureAssignment(ChangeLoggedModel):
    plan = models.ForeignKey(Plan, on_delete=models.CASCADE, related_name="feature_assignments")
    feature = models.ForeignKey(
        PlanFeature, on_delete=models.CASCADE, related_name="plan_assignments"
    )
    value = models.CharField(max_length=120, blank=True)
    highlighted = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ("sort_order", "feature__name")
        constraints = [
            models.UniqueConstraint(
                fields=("plan", "feature"), name="unique_plan_feature_assignment"
            ),
        ]

    def __str__(self) -> str:
        return f"{self.plan} · {self.feature}"
