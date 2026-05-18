from core.navigation import Menu, MenuGroup, MenuItem, register_navigation_provider


def analytics_navigation(_request):
    return [
        Menu(
            label="Analytics",
            icon="chart",
            staff_only=True,
            groups=[
                MenuGroup(
                    label="Admin",
                    items=[
                        MenuItem(
                            label="Overview",
                            route_name="admin:overview",
                            active_names=("admin:overview", "admin:analytics-index"),
                            staff_only=True,
                        ),
                        MenuItem(
                            label="Traffic",
                            route_name="admin:analytics-traffic",
                            active_names=("admin:analytics-traffic",),
                            staff_only=True,
                        ),
                        MenuItem(
                            label="Revenue",
                            route_name="admin:analytics-revenue",
                            active_names=("admin:analytics-revenue",),
                            staff_only=True,
                        ),
                    ],
                )
            ],
        )
    ]


register_navigation_provider(analytics_navigation)
