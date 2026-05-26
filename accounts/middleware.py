from __future__ import annotations

import logging

from django.conf import settings
from django.contrib.auth.models import AnonymousUser

from .auth import ClerkUserSyncError, authenticate_clerk_request, get_user_from_clerk_state

logger = logging.getLogger(__name__)


class ClerkAuthenticationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.clerk_state = None
        request.clerk_user_id = ""
        request.clerk_session_id = ""

        if not self._should_skip(request):
            self._authenticate(request)

        return self.get_response(request)

    def _authenticate(self, request):
        state = authenticate_clerk_request(request)
        request.clerk_state = state

        if not state.is_signed_in:
            self._set_anonymous(request)
            return

        payload = state.payload or {}
        request.clerk_user_id = payload.get("sub", "")
        request.clerk_session_id = payload.get("sid", "")

        try:
            user = get_user_from_clerk_state(state)
        except ClerkUserSyncError as exc:
            logger.warning("Clerk user sync failed: %s", exc)
            self._set_anonymous(request)
            return

        if user.is_active:
            request.user = user
            request._cached_user = user
        else:
            self._set_anonymous(request)

    def _set_anonymous(self, request):
        request.user = AnonymousUser()
        request._cached_user = request.user

    def _should_skip(self, request):
        path = request.path
        return path.startswith(settings.STATIC_URL) or path.startswith(settings.MEDIA_URL)
