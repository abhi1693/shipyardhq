from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.db import models
from django.utils import timezone


class UserQuerySet(models.QuerySet):
    def update(self, **kwargs):
        if "is_superuser" in kwargs:
            raise ValidationError({"is_superuser": "Superuser status can only be changed by another superuser."})
        return super().update(**kwargs)

    def bulk_update(self, objs, fields, batch_size=None):
        if "is_superuser" in fields:
            raise ValidationError({"is_superuser": "Superuser status can only be changed by another superuser."})
        return super().bulk_update(objs, fields, batch_size=batch_size)


class UserManager(BaseUserManager.from_queryset(UserQuerySet)):
    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    create_user.alters_data = True

    async def acreate_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_superuser", False)
        return await self._acreate_user(email, password, **extra_fields)

    acreate_user.alters_data = True

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_superuser", True)
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return self._create_user(email, password, **extra_fields)

    create_superuser.alters_data = True

    async def acreate_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_superuser", True)
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return await self._acreate_user(email, password, **extra_fields)

    acreate_superuser.alters_data = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("Email must be set.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    async def _acreate_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("Email must be set.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        await user.asave(using=self._db)
        return user


class User(AbstractBaseUser):
    email = models.EmailField(
        unique=True,
        error_messages={
            "unique": "A user with that email address already exists.",
        },
    )
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    is_active = models.BooleanField(default=True)
    is_superuser = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()
    EMAIL_FIELD = "email"
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        ordering = ("email",)
        indexes = [models.Index(fields=("email",))]

    def __str__(self):
        return self.email

    def clean(self):
        super().clean()
        self._validate_superuser_status_change()
        self.email = self.__class__.objects.normalize_email(self.email)
        if self.__class__.objects.exclude(pk=self.pk).filter(email__iexact=self.email).exists():
            raise ValidationError({"email": "A user with that email address already exists."})

    def save(self, *args, **kwargs):
        self._validate_superuser_status_change()
        super().save(*args, **kwargs)
        if hasattr(self, "_superuser_status_changed_by"):
            del self._superuser_status_changed_by

    def set_superuser_status(self, is_superuser, changed_by):
        self._validate_superuser_status_actor(changed_by)
        self.is_superuser = is_superuser
        self._superuser_status_changed_by = changed_by
        self.save(update_fields=("is_superuser",))

    def _validate_superuser_status_change(self):
        if self._state.adding or not self.pk:
            return

        try:
            existing = self.__class__.objects.using(self._state.db or "default").only("is_superuser").get(pk=self.pk)
        except self.__class__.DoesNotExist:
            return

        if existing.is_superuser != self.is_superuser:
            changed_by = getattr(self, "_superuser_status_changed_by", None)
            self._validate_superuser_status_actor(changed_by)

    def _validate_superuser_status_actor(self, changed_by):
        if not changed_by or not changed_by.is_active or not changed_by.is_superuser:
            raise ValidationError({"is_superuser": "Superuser status can only be changed by another superuser."})
        if self.pk and changed_by.pk == self.pk:
            raise ValidationError({"is_superuser": "You cannot change your own superuser status."})

    def get_full_name(self):
        full_name = f"{self.first_name} {self.last_name}"
        return full_name.strip()

    def get_short_name(self):
        return self.first_name

    def email_user(self, subject, message, from_email=None, **kwargs):
        send_mail(subject, message, from_email, [self.email], **kwargs)

    def has_perm(self, perm, obj=None):
        return self.is_active and self.is_superuser

    def has_module_perms(self, app_label):
        return self.is_active and self.is_superuser
