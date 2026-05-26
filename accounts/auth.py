from __future__ import annotations

import logging
from functools import lru_cache

from clerk_backend_api import AuthenticateRequestOptions, Clerk, authenticate_request
from django.conf import settings

from .models import User

logger = logging.getLogger(__name__)


class ClerkUserSyncError(Exception):
    pass


def authenticate_clerk_request(request):
    return authenticate_request(request, _authenticate_options())


def get_user_from_clerk_state(state):
    payload = state.payload or {}
    clerk_id = payload.get("sub")
    if not clerk_id:
        raise ClerkUserSyncError("missing_clerk_id")

    user = User.objects.filter(clerk_id=clerk_id, is_active=True).first()
    if user is not None:
        return user

    profile = _clerk_profile(clerk_id)
    email = profile["email"] or payload.get("email") or ""
    if not email:
        raise ClerkUserSyncError("missing_email")

    return User.objects.sync_from_clerk(
        clerk_id=clerk_id,
        email=email,
        first_name=profile["first_name"],
        last_name=profile["last_name"],
    )


def _authenticate_options():
    return AuthenticateRequestOptions(
        secret_key=settings.CLERK_SECRET_KEY or None,
        jwt_key=settings.CLERK_JWT_KEY or None,
        authorized_parties=list(settings.CLERK_AUTHORIZED_PARTIES) or None,
        accepts_token=["session_token"],
    )


def _clerk_profile(clerk_id):
    if not settings.CLERK_SECRET_KEY:
        return {"email": "", "first_name": "", "last_name": ""}

    try:
        user = _clerk_client().users.get(user_id=clerk_id)
    except Exception as exc:
        logger.warning("Clerk user lookup failed: %s", exc.__class__.__name__)
        return {"email": "", "first_name": "", "last_name": ""}

    return {
        "email": _primary_email(user),
        "first_name": getattr(user, "first_name", "") or "",
        "last_name": getattr(user, "last_name", "") or "",
    }


def _primary_email(clerk_user):
    primary_email_id = getattr(clerk_user, "primary_email_address_id", None)
    email_addresses = getattr(clerk_user, "email_addresses", []) or []

    for email_address in email_addresses:
        if getattr(email_address, "id", None) == primary_email_id:
            return getattr(email_address, "email_address", "") or ""

    if email_addresses:
        return getattr(email_addresses[0], "email_address", "") or ""

    return ""


@lru_cache
def _clerk_client():
    return Clerk(bearer_auth=settings.CLERK_SECRET_KEY)
