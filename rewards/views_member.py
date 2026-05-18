from core.generic_views import DashboardView
from core.mixins import OnboardingRequiredMixin
from rewards.models import Redemption, RewardBalance, RewardTransaction


class MemberRewardsView(OnboardingRequiredMixin, DashboardView):
    base_template = "base/private.html"
    section_eyebrow = "Member"
    page_title = "Rewards"
    page_description = "Track balance, transactions, and redemption history."

    def get_metrics(self):
        balance = RewardBalance.objects.filter(user=self.request.user).first()
        return [
            {
                "label": "Balance",
                "value": getattr(balance, "balance", 0),
                "help_text": "Available reward points.",
            },
            {
                "label": "Lifetime earned",
                "value": getattr(balance, "lifetime_earned", 0),
                "help_text": "All-time points accrued.",
            },
            {
                "label": "Redemptions",
                "value": Redemption.objects.filter(user=self.request.user).count(),
                "help_text": "Catalog items redeemed.",
            },
        ]

    def get_cards(self):
        latest_transactions = RewardTransaction.objects.filter(user=self.request.user)[:3]
        return [
            {
                "label": "Recent activity",
                "title": transaction.note or transaction.get_transaction_type_display(),
                "body": f"{transaction.amount} points",
            }
            for transaction in latest_transactions
        ] or [
            {
                "label": "Recent activity",
                "title": "No transactions yet",
                "body": "Reward activity will appear here once rules begin awarding points.",
            }
        ]
