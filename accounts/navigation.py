from core.navigation import Menu, MenuGroup, MenuItem, register_navigation_provider


def account_navigation(_request):
    return [
        Menu(
            label="Member",
            icon="grid",
            auth_required=True,
            groups=[
                MenuGroup(
                    label="Workspace",
                    items=[
                        MenuItem(
                            label="Overview",
                            route_name="member:overview",
                            active_names=("member:overview",),
                            auth_required=True,
                        ),
                        MenuItem(
                            label="Profile",
                            route_name="member:account-profile",
                            active_names=("member:account-profile",),
                            auth_required=True,
                        ),
                    ],
                )
            ],
        ),
        Menu(
            label="Admin",
            icon="shield",
            staff_only=True,
            groups=[
                MenuGroup(
                    label="Access",
                    items=[
                        MenuItem(
                            label="Overview",
                            route_name="admin:overview",
                            active_names=("admin:overview",),
                            staff_only=True,
                        ),
                        MenuItem(
                            label="Users",
                            route_name="admin:users",
                            active_names=(
                                "admin:users",
                                "admin:user-detail",
                                "admin:user-add",
                                "admin:user-edit",
                                "admin:user-delete",
                            ),
                            staff_only=True,
                        ),
                    ],
                )
            ],
        ),
    ]


register_navigation_provider(account_navigation)
