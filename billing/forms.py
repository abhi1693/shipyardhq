from decimal import ROUND_HALF_UP, Decimal

from django import forms
from django.utils.text import slugify

from .models import Plan


class PlanEditForm(forms.ModelForm):
    price = forms.DecimalField(
        label="Price",
        max_digits=10,
        decimal_places=2,
        min_value=Decimal("0.00"),
        widget=forms.NumberInput(attrs={"class": "member-form-control", "min": "0", "step": "0.01"}),
    )
    discount_percent = forms.IntegerField(
        label="Discount percent",
        required=False,
        min_value=0,
        max_value=100,
        widget=forms.NumberInput(attrs={"class": "member-form-control", "min": "0", "max": "100", "step": "1"}),
    )

    class Meta:
        model = Plan
        fields = (
            "name",
            "slug",
            "description",
            "type",
            "price",
            "discount_percent",
            "boost_for_days",
            "is_default",
            "is_active",
            "payment_frequency_count",
            "payment_frequency_interval",
            "subscription_period_count",
            "subscription_period_interval",
        )
        labels = {
            "is_default": "Default plan",
            "is_active": "Active",
            "payment_frequency_count": "Payment every",
            "payment_frequency_interval": "Payment interval",
            "subscription_period_count": "Subscription length",
            "subscription_period_interval": "Subscription interval",
        }
        widgets = {
            "name": forms.TextInput(attrs={"class": "member-form-control", "data-slug-source": "id_slug"}),
            "slug": forms.TextInput(attrs={"class": "member-form-control", "data-slug-target": "id_name"}),
            "description": forms.Textarea(attrs={"class": "member-form-control member-form-textarea", "rows": 4}),
            "type": forms.Select(attrs={"class": "member-form-control member-form-select", "data-plan-type": ""}),
            "boost_for_days": forms.NumberInput(attrs={"class": "member-form-control", "min": "1", "max": "30"}),
            "is_default": forms.CheckboxInput(attrs={"class": "member-form-checkbox"}),
            "is_active": forms.CheckboxInput(attrs={"class": "member-form-checkbox"}),
            "payment_frequency_count": forms.NumberInput(
                attrs={"class": "member-form-control", "min": "1", "data-plan-recurring-field": ""}
            ),
            "payment_frequency_interval": forms.Select(
                attrs={"class": "member-form-control member-form-select", "data-plan-recurring-field": ""}
            ),
            "subscription_period_count": forms.NumberInput(
                attrs={"class": "member-form-control", "min": "1", "data-plan-recurring-field": ""}
            ),
            "subscription_period_interval": forms.Select(
                attrs={"class": "member-form-control member-form-select", "data-plan-recurring-field": ""}
            ),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["payment_frequency_interval"].required = False
        self.fields["payment_frequency_interval"].choices = (("", "Month"), *Plan.TimeInterval.choices)
        self.fields["subscription_period_interval"].required = False
        self.fields["subscription_period_interval"].choices = (("", "Month"), *Plan.TimeInterval.choices)

        if self.instance.pk:
            self.fields["price"].initial = self.instance.price_amount
            if self.instance.discount_percent is not None:
                self.initial["discount_percent"] = int(self.instance.discount_percent)

    def clean_slug(self):
        slug = self.cleaned_data["slug"] or slugify(self.cleaned_data.get("name", ""))
        return slugify(slug)

    def clean_discount_percent(self):
        return self.cleaned_data["discount_percent"]

    def clean(self):
        cleaned_data = super().clean()
        plan_type = cleaned_data.get("type")
        if plan_type == Plan.Type.RECURRING:
            cleaned_data["payment_frequency_count"] = cleaned_data.get("payment_frequency_count") or 1
            cleaned_data["payment_frequency_interval"] = (
                cleaned_data.get("payment_frequency_interval") or Plan.TimeInterval.MONTH
            )
            cleaned_data["subscription_period_count"] = (
                cleaned_data.get("subscription_period_count") or cleaned_data["payment_frequency_count"]
            )
            cleaned_data["subscription_period_interval"] = (
                cleaned_data.get("subscription_period_interval") or cleaned_data["payment_frequency_interval"]
            )
        else:
            cleaned_data["payment_frequency_count"] = None
            cleaned_data["payment_frequency_interval"] = ""
            cleaned_data["subscription_period_count"] = None
            cleaned_data["subscription_period_interval"] = ""
        return cleaned_data

    def save(self, commit=True):
        plan = super().save(commit=False)
        price = self.cleaned_data["price"]
        plan.price_cents = int((price * Decimal("100")).quantize(Decimal("1"), ROUND_HALF_UP))
        if commit:
            plan.save()
        return plan
