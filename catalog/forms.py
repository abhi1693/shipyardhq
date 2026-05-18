from django import forms
from django.utils.text import slugify

from catalog.models import MemberFeedback, Product, ProductClaimAttempt


class MemberProductForm(forms.ModelForm):
    class Meta:
        model = Product
        fields = (
            "name",
            "slug",
            "tagline",
            "description",
            "website_url",
            "product_type",
            "pricing_model",
            "platform",
            "categories",
            "use_cases",
            "tags",
            "featured",
        )

    def clean_slug(self):
        slug = self.cleaned_data.get("slug")
        name = self.cleaned_data.get("name")
        return slug or slugify(name or "")


class ProductClaimForm(forms.ModelForm):
    class Meta:
        model = ProductClaimAttempt
        fields = ("product", "method", "proof_url", "notes")


class FeedbackForm(forms.ModelForm):
    class Meta:
        model = MemberFeedback
        fields = ("product", "subject", "message")
