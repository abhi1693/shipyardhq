from django.contrib.auth.backends import ModelBackend
from django.db.models import Q

from accounts.models import User


class EmailOrUsernameBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        identifier = username or kwargs.get("email")
        if not identifier or not password:
            return None

        candidates = User.objects.filter(
            Q(username__iexact=identifier) | Q(email__iexact=identifier)
        ).order_by("id")

        for user in candidates:
            if user.check_password(password) and self.user_can_authenticate(user):
                return user

        User().set_password(password)
        return None
