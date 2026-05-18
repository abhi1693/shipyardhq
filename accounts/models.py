from django.contrib.auth.models import AbstractUser
from django.core.validators import MinLengthValidator
from django.db import models
from django.urls import reverse
from django.utils import timezone

from core.models import ChangeLoggedModel


class User(ChangeLoggedModel, AbstractUser):
    class Role(models.TextChoices):
        MEMBER = "member", "Member"
        ADMIN = "admin", "Admin"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        SUSPENDED = "suspended", "Suspended"
        TERMINATED = "terminated", "Terminated"

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.MEMBER)
    role_intent = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    heard_from = models.CharField(max_length=120, blank=True)
    onboarded_at = models.DateTimeField(null=True, blank=True)
    suspended_at = models.DateTimeField(null=True, blank=True)
    terminated_at = models.DateTimeField(null=True, blank=True)
    bio = models.TextField(blank=True)
    display_name = models.CharField(
        max_length=150,
        blank=True,
        validators=[MinLengthValidator(2)],
    )

    REQUIRED_FIELDS = ["email"]

    class Meta:
        ordering = ("username",)

    def save(self, *args, **kwargs):
        if self.email:
            self.email = self.email.lower()
        if self.role == self.Role.ADMIN:
            self.is_staff = True
        if self.status == self.Status.SUSPENDED and not self.suspended_at:
            self.suspended_at = timezone.now()
        if self.status == self.Status.TERMINATED:
            self.is_active = False
            if not self.terminated_at:
                self.terminated_at = timezone.now()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.display_name or self.get_full_name() or self.username

    def get_absolute_url(self):
        return reverse("public:user-detail", args=[self.pk])
