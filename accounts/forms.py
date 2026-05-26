from django import forms
from django.core.exceptions import ValidationError
from django.db import transaction

from .models import User


class UserEditForm(forms.Form):
    email = forms.EmailField(
        label="Email",
        widget=forms.EmailInput(attrs={"class": "member-form-control"}),
    )
    first_name = forms.CharField(
        label="First name",
        max_length=150,
        required=False,
        widget=forms.TextInput(attrs={"class": "member-form-control"}),
    )
    last_name = forms.CharField(
        label="Last name",
        max_length=150,
        required=False,
        widget=forms.TextInput(attrs={"class": "member-form-control"}),
    )
    is_active = forms.BooleanField(
        label="Active",
        required=False,
        widget=forms.CheckboxInput(attrs={"class": "member-form-checkbox"}),
    )
    is_superuser = forms.BooleanField(
        label="Superuser",
        required=False,
        widget=forms.CheckboxInput(attrs={"class": "member-form-checkbox"}),
    )

    def __init__(self, *args, instance, changed_by, **kwargs):
        self.instance = instance
        self.changed_by = changed_by
        self.original_is_superuser = instance.is_superuser
        initial = {
            "email": instance.email,
            "first_name": instance.first_name,
            "last_name": instance.last_name,
            "is_active": instance.is_active,
            "is_superuser": instance.is_superuser,
        }
        kwargs.setdefault("initial", initial)
        super().__init__(*args, **kwargs)

    def clean_email(self):
        email = User.objects.normalize_email(self.cleaned_data["email"])
        if User.objects.exclude(pk=self.instance.pk).filter(email__iexact=email).exists():
            raise ValidationError("A user with that email address already exists.")
        return email

    def clean_is_superuser(self):
        is_superuser = self.cleaned_data["is_superuser"]
        if self.instance.pk == self.changed_by.pk and is_superuser != self.original_is_superuser:
            raise ValidationError("You cannot change your own access.")
        return is_superuser

    def save(self):
        changed_fields = []
        for field_name in ("email", "first_name", "last_name", "is_active"):
            value = self.cleaned_data[field_name]
            if getattr(self.instance, field_name) != value:
                setattr(self.instance, field_name, value)
                changed_fields.append(field_name)

        with transaction.atomic():
            if changed_fields:
                self.instance.save(update_fields=changed_fields)

            is_superuser = self.cleaned_data["is_superuser"]
            if is_superuser != self.original_is_superuser:
                self.instance.set_superuser_status(is_superuser, self.changed_by)

        return self.instance
