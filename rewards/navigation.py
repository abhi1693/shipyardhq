from core.navigation import Menu, MenuGroup, MenuItem, register_navigation_provider


def rewards_navigation(_request):
    return [
        Menu(
            label="Rewards",
            icon="gift",
            auth_required=True,
            groups=[
                MenuGroup(
                    label="Member",
                    items=[
                        MenuItem(
                            label="Rewards",
                            route_name="member:rewards",
                            active_names=("member:rewards",),
                            auth_required=True,
                        )
                    ],
                ),
                MenuGroup(
                    label="Admin",
                    items=[
                        MenuItem(
                            label="Rules",
                            route_name="admin:reward-rules",
                            active_names=(
                                "admin:reward-rules",
                                "admin:reward-rule-add",
                                "admin:reward-rule-detail",
                                "admin:reward-rule-edit",
                                "admin:reward-rule-delete",
                            ),
                            staff_only=True,
                        ),
                        MenuItem(
                            label="Catalog",
                            route_name="admin:reward-catalog",
                            active_names=(
                                "admin:reward-catalog",
                                "admin:reward-catalog-add",
                                "admin:reward-catalog-detail",
                                "admin:reward-catalog-edit",
                                "admin:reward-catalog-delete",
                            ),
                            staff_only=True,
                        ),
                        MenuItem(
                            label="Transactions",
                            route_name="admin:reward-transactions",
                            active_names=("admin:reward-transactions",),
                            staff_only=True,
                        ),
                    ],
                ),
            ],
        )
    ]


register_navigation_provider(rewards_navigation)
