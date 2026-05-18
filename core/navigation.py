from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass, field

from django.urls import NoReverseMatch, reverse

NavigationProvider = Callable[[object], object]
_providers: list[NavigationProvider] = []


@dataclass
class MenuItem:
    label: str
    route_name: str | None = None
    url: str | None = None
    icon: str | None = None
    active_names: Sequence[str] = ()
    auth_required: bool = False
    staff_only: bool = False
    _resolved_url: str | None = field(init=False, default=None, repr=False)

    def resolve_url(self) -> str | None:
        if self._resolved_url is not None:
            return self._resolved_url
        if self.url:
            self._resolved_url = self.url
            return self._resolved_url
        if not self.route_name:
            return None
        try:
            self._resolved_url = reverse(self.route_name)
        except NoReverseMatch:
            self._resolved_url = None
        return self._resolved_url

    def is_visible(self, user) -> bool:
        if self.auth_required and not getattr(user, "is_authenticated", False):
            return False
        if self.staff_only and not getattr(user, "is_staff", False):
            return False
        return True

    def is_active(self, current_view_name: str | None) -> bool:
        if not current_view_name:
            return False
        active_names = self.active_names or ((self.route_name,) if self.route_name else ())
        return current_view_name in active_names


@dataclass
class MenuGroup:
    label: str
    items: Sequence[MenuItem]


@dataclass
class Menu:
    label: str
    icon: str | None
    groups: Sequence[MenuGroup]
    auth_required: bool = False
    staff_only: bool = False

    def is_visible(self, user) -> bool:
        if self.auth_required and not getattr(user, "is_authenticated", False):
            return False
        if self.staff_only and not getattr(user, "is_staff", False):
            return False
        return True


def register_navigation_provider(provider: NavigationProvider) -> None:
    if provider not in _providers:
        _providers.append(provider)


def build_navigation(request) -> list[dict]:
    current_view_name = getattr(getattr(request, "resolver_match", None), "view_name", None)
    user = request.user
    nav_items = []

    for provider in _providers:
        contribution = provider(request)
        if not contribution:
            continue

        menus = contribution if isinstance(contribution, Sequence) else (contribution,)
        for menu in menus:
            if not menu.is_visible(user):
                continue

            groups = []
            menu_active = False
            for group in menu.groups:
                items = []
                for item in group.items:
                    if not item.is_visible(user):
                        continue
                    resolved_url = item.resolve_url()
                    if not resolved_url:
                        continue
                    is_active = item.is_active(current_view_name)
                    menu_active = menu_active or is_active
                    items.append(
                        {
                            "label": item.label,
                            "url": resolved_url,
                            "icon": item.icon,
                            "active": is_active,
                        }
                    )
                if items:
                    groups.append({"label": group.label, "items": items})

            if groups:
                nav_items.append(
                    {
                        "label": menu.label,
                        "icon": menu.icon,
                        "groups": groups,
                        "active": menu_active,
                    }
                )

    return nav_items
