from core.navigation import Menu, MenuGroup, MenuItem, register_navigation_provider


def events_navigation(_request):
    return [
        Menu(
            label="Operations",
            icon="activity",
            staff_only=True,
            groups=[
                MenuGroup(
                    label="Admin",
                    items=[
                        MenuItem(
                            label="Events",
                            route_name="admin:events",
                            active_names=(
                                "admin:events",
                                "admin:event-detail",
                                "admin:event-delete",
                            ),
                            staff_only=True,
                        ),
                        MenuItem(
                            label="Notifications",
                            route_name="admin:notifications",
                            active_names=("admin:notifications",),
                            staff_only=True,
                        ),
                    ],
                )
            ],
        )
    ]


register_navigation_provider(events_navigation)
