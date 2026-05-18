from django import forms
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm

from accounts.models import User


class LoginForm(AuthenticationForm):
    username = forms.CharField(label="Username or email")


class RegisterForm(UserCreationForm):
    email = forms.EmailField()

    class Meta:
        model = User
        fields = ("username", "email", "first_name", "last_name")


class ProfileForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ("display_name", "first_name", "last_name", "email", "bio")


class OnboardingForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ("display_name", "first_name", "last_name", "bio")


class AdminUserForm(forms.ModelForm):
    class Meta:
        model = User
        fields = (
            "username",
            "display_name",
            "first_name",
            "last_name",
            "email",
            "role",
            "status",
            "bio",
        )
