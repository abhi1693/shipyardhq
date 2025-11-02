import Link from "next/link"
import { formatDistanceToNow } from "date-fns"

import { getPublicRewardsData } from "@/actions/public/rewards/actions"
import { Badge } from "@/components/atoms/badge"
import {
  LEADERBOARD_REWARDS_PATH,
  MEMBER_REWARDS_PATH,
  MEMBER_PRODUCTS_PATH,
} from "@/lib/routes"
import { cn } from "@/lib/utils"
import {
  RedemptionStatus,
  RewardFeatureCategory,
  RewardRuleCategory,
} from "@/lib/vendor/prisma/client"
import { launchPrimaryButton, launchSecondaryButton } from "@/lib/ui/buttons"
import { brandGradient, gradientTint } from "@/lib/ui/tints"

const ruleCategoryLabels: Record<RewardRuleCategory, string> = {
  [RewardRuleCategory.engagement]: "Engagement",
  [RewardRuleCategory.streak]: "Streaks",
  [RewardRuleCategory.admin]: "Admin",
  [RewardRuleCategory.system]: "System",
  [RewardRuleCategory.bonus]: "Bonus",
}

const rewardCategoryLabels: Record<RewardFeatureCategory, string> = {
  [RewardFeatureCategory.placement]: "Placement",
  [RewardFeatureCategory.analytics]: "Analytics",
  [RewardFeatureCategory.insights]: "Insights",
  [RewardFeatureCategory.access]: "Access",
  [RewardFeatureCategory.exposure]: "Exposure",
  [RewardFeatureCategory.utility]: "Utility",
}

const redemptionStatusLabels: Record<RedemptionStatus, string> = {
  [RedemptionStatus.pending]: "Queued",
  [RedemptionStatus.active]: "Active",
  [RedemptionStatus.expired]: "Expired",
  [RedemptionStatus.canceled]: "Canceled",
  [RedemptionStatus.failed]: "Failed",
  [RedemptionStatus.refunded]: "Refunded",
}

const redemptionStatusTone: Record<RedemptionStatus, string> = {
  [RedemptionStatus.pending]: "text-amber-600",
  [RedemptionStatus.active]: "text-emerald-600",
  [RedemptionStatus.expired]: "text-slate-500",
  [RedemptionStatus.canceled]: "text-slate-500",
  [RedemptionStatus.failed]: "text-rose-600",
  [RedemptionStatus.refunded]: "text-emerald-600",
}

const numberFormatter = new Intl.NumberFormat("en-US")
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
})

function formatNumber(value: number) {
  return numberFormatter.format(value)
}

function formatRewards(value: number) {
  return `${formatNumber(value)} rewards`
}

function formatRelative(date: Date) {
  return formatDistanceToNow(date, { addSuffix: true })
}

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) return null
  const hours = Math.round(seconds / 3600)
  if (hours < 24) {
    return `${hours}h duration`
  }
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? "" : "s"}`
}

export async function RewardsPageContent() {
  const data = await getPublicRewardsData()

  const stats = [
    {
      label: "Members earning",
      value: formatNumber(data.stats.membersWithRewards),
      helper: "Received rewards",
    },
    {
      label: "Active balances",
      value: formatNumber(data.stats.activeBalances),
      helper: "Ready to spend",
    },
    {
      label: "Rewards awarded (30d)",
      value: formatRewards(data.stats.earnedLast30d.rewardAmount),
      helper: `${formatNumber(data.stats.earnedLast30d.transactions)} payouts logged`,
    },
    {
      label: "Rewards redeemed (30d)",
      value: formatNumber(data.stats.spentLast30d.redemptions),
      helper: `${formatRewards(data.stats.spentLast30d.rewardAmount)} spent on launches`,
    },
  ]

  const heroRedemptions = data.recentRedemptions
  const rewardRules = data.rules
  const rewardsCatalog = data.rewards

  const earnedRewardAmount = data.stats.earnedLast30d.rewardAmount
  const earnedTransactions = data.stats.earnedLast30d.transactions
  const spentRewardAmount = data.stats.spentLast30d.rewardAmount
  const spentRedemptions = data.stats.spentLast30d.redemptions
  const conversionRate =
    earnedRewardAmount > 0
      ? Math.min(spentRewardAmount / earnedRewardAmount, 1) * 100
      : 0
  const averagePayout =
    earnedTransactions > 0 ? earnedRewardAmount / earnedTransactions : 0
  const averageRedemption =
    spentRedemptions > 0 ? spentRewardAmount / spentRedemptions : 0
  const activeShare =
    data.stats.membersWithRewards > 0
      ? (data.stats.activeBalances / data.stats.membersWithRewards) * 100
      : 0

  const earningGridClass = cn(
    "mx-auto mt-12 grid grid-cols-1 justify-items-center gap-6",
    rewardRules.length === 1
      ? "max-w-sm"
      : rewardRules.length === 2
        ? "max-w-3xl sm:grid-cols-2 lg:grid-cols-2"
        : "max-w-5xl sm:grid-cols-2 lg:grid-cols-3",
  )

  return (
    <main className="relative isolate overflow-hidden bg-white">
      <section
        className={brandGradient(
          "relative overflow-hidden border border-[color:var(--brand-1)/0.18] py-24 shadow-[0px_70px_160px_-70px_rgba(18,66,112,0.75)]",
        )}
      >
        <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-10 px-4 text-center text-white md:px-8">
          <span
            className={gradientTint(
              "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.32em] text-white/80",
            )}
          >
            Shipyard Rewards
          </span>
          <div className="space-y-6 text-balance">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              Turn authentic engagement into launch-grade visibility
            </h1>
            <p className="mx-auto max-w-3xl text-lg text-white/85">
              Contribute reviews, verify traction, and keep streaks alive to
              bank rewards. When you&apos;re ready, swap that momentum for
              homepage features, analytics, and marquee placements.
            </p>
          </div>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={MEMBER_REWARDS_PATH}
              className={launchPrimaryButton({ size: "lg" })}
            >
              Check your balance
            </Link>
            <Link
              href="/register"
              className={launchSecondaryButton({
                size: "lg",
                className: "text-white/90 hover:text-white",
              })}
            >
              Join Shipyard
            </Link>
            <Link
              href={LEADERBOARD_REWARDS_PATH}
              className={gradientTint(
                "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white/85 transition hover:text-white",
              )}
            >
              See leaderboard
            </Link>
          </div>
          <div className="mt-12 grid w-full grid-cols-1 gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((item) => (
              <div
                key={item.label}
                className="relative overflow-hidden rounded-2xl border border-white/25 bg-white/92 px-5 py-5 text-foreground shadow-[0px_22px_48px_-38px_rgba(7,58,104,0.58)] backdrop-blur before:absolute before:inset-0 before:-z-10 before:bg-[radial-gradient(120%_120%_at_50%_-20%,var(--brand-1)/0.18,transparent)] before:content-['']"
              >
                <div className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">
                  <span className="line-clamp-2 min-h-[2.4em] leading-[1.2]">
                    {item.label}
                  </span>
                  <span className="inline-flex h-1.5 w-6 shrink-0 rounded-full bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2))]" />
                </div>
                <div className="mt-4 flex min-h-[3.6rem] flex-col justify-between gap-2">
                  <p className="text-2xl font-semibold tracking-tight text-foreground">
                    {item.value}
                  </p>
                  {item.helper ? (
                    <p className="text-xs text-muted-foreground/80">
                      {item.helper}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden py-20">
        <div
          aria-hidden
          className="absolute inset-0 -z-20 bg-[radial-gradient(120%_120%_at_0%_0%,var(--brand-1)/0.16,transparent_58%)]"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(120%_120%_at_100%_0%,var(--brand-2)/0.14,transparent_60%)]"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 -z-10 h-64 bg-gradient-to-t from-[color:var(--brand-1)/0.08] via-transparent to-transparent"
        />
        <div className="mx-auto grid max-w-[84rem] gap-10 px-4 md:px-8 lg:grid-cols-[1.05fr,0.95fr]">
          <div className="space-y-6">
            <article className="relative overflow-hidden rounded-[32px] bg-white/70 p-6 shadow-[0px_40px_120px_-60px_rgba(7,58,104,0.55)] backdrop-blur md:p-8 ring-1 ring-[rgba(7,58,104,0.08)]">
              <div
                aria-hidden
                className="absolute inset-x-0 -top-1 h-1 bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))]"
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1 text-left">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                    Fleet pulse • 30 days
                  </p>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                    Earned fuel vs launch spend
                  </h2>
                </div>
                <Badge
                  variant="secondary"
                  className="uppercase tracking-[0.2em] text-[10px]"
                >
                  Live snapshot
                </Badge>
              </div>

              <div className="mt-6 space-y-6">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-end justify-between gap-3 text-left">
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">
                        Rewards earned
                      </p>
                      <p className="text-2xl font-semibold text-foreground">
                        {formatRewards(earnedRewardAmount)}
                      </p>
                      <p className="text-[11px] text-muted-foreground/80">
                        {formatNumber(earnedTransactions)} payouts logged
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-muted-foreground">
                        Rewards spent
                      </p>
                      <p className="text-2xl font-semibold text-foreground">
                        {formatRewards(spentRewardAmount)}
                      </p>
                      <p className="text-[11px] text-muted-foreground/80">
                        {formatNumber(spentRedemptions)} redemptions
                      </p>
                    </div>
                  </div>

                  <div className="relative mt-4 h-2 rounded-full bg-[color:var(--brand-1)/0.08]">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2))]"
                      style={{
                        width: `${Math.min(conversionRate, 100).toFixed(0)}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground/80">
                    <span>0%</span>
                    <span>
                      {conversionRate.toFixed(0)}% of earned rewards already
                      reinvested
                    </span>
                    <span>100%</span>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1 text-left">
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-muted-foreground">
                      Avg payout
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      {formatRewards(Math.round(averagePayout))}
                    </p>
                    <p className="text-[11px] text-muted-foreground/80">
                      Per earn transaction
                    </p>
                  </div>
                  <div className="space-y-1 text-left">
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-muted-foreground">
                      Avg redemption
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      {formatRewards(Math.round(averageRedemption))}
                    </p>
                    <p className="text-[11px] text-muted-foreground/80">
                      Per reward spend
                    </p>
                  </div>
                  <div className="space-y-1 text-left">
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-muted-foreground">
                      Active share
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      {activeShare.toFixed(0)}%
                    </p>
                    <p className="text-[11px] text-muted-foreground/80">
                      Members ready to redeem
                    </p>
                  </div>
                </div>
              </div>
            </article>
          </div>

          <article className="relative overflow-hidden rounded-[32px] bg-white/68 p-6 shadow-[0px_36px_110px_-56px_rgba(7,58,104,0.5)] backdrop-blur md:p-8 ring-1 ring-[rgba(7,58,104,0.08)]">
            <div
              aria-hidden
              className="absolute inset-x-0 -top-1 h-1 bg-[linear-gradient(90deg,var(--brand-2),var(--brand-3),var(--brand-1))]"
            />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  Latest redemptions
                </p>
                <h3 className="mt-2 text-lg font-semibold text-foreground">
                  Builders spending momentum this week
                </h3>
              </div>
              <Badge
                variant="secondary"
                className="uppercase tracking-[0.2em] text-[10px]"
              >
                Live feed
              </Badge>
            </div>
            <ul className="mt-6 space-y-4 text-sm text-muted-foreground">
              {heroRedemptions.length > 0 ? (
                heroRedemptions.map((entry) => {
                  const productLabel = entry.productName ?? "Private team"
                  const productHref = entry.productSlug
                    ? `/products/${entry.productSlug}`
                    : null
                  return (
                    <li key={entry.id} className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="space-y-1 text-left">
                          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground/80">
                            {entry.name ?? entry.featureKey}
                          </p>
                          {productHref ? (
                            <Link
                              href={productHref}
                              className="text-base font-semibold text-foreground underline-offset-4 transition-colors hover:text-[color:var(--brand-1)] hover:underline"
                            >
                              {productLabel}
                            </Link>
                          ) : (
                            <p className="text-base font-semibold text-foreground">
                              {productLabel}
                            </p>
                          )}
                        </div>
                        <span className="rounded-full bg-[color:var(--brand-1)/0.08] px-3 py-1 text-xs font-semibold text-[color:var(--brand-1)]">
                          {formatRewards(entry.cost)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground/80">
                        <span
                          className={cn(
                            "font-semibold",
                            redemptionStatusTone[entry.status],
                          )}
                        >
                          {redemptionStatusLabels[entry.status]}
                        </span>
                        <span>{dateFormatter.format(entry.createdAt)}</span>
                        <span>{formatRelative(entry.createdAt)}</span>
                      </div>
                    </li>
                  )
                })
              ) : (
                <li className="rounded-2xl border border-dashed border-[color:var(--brand-1)/0.18] bg-white/70 px-4 py-6 text-xs text-muted-foreground backdrop-blur">
                  Redemptions will appear here as soon as the first rewards
                  activate.
                </li>
              )}
            </ul>
          </article>
        </div>
      </section>

      <section className="relative overflow-hidden py-16">
        <div className="mx-auto max-w-[84rem] px-4 md:px-8">
          <div
            aria-hidden
            className="absolute inset-0 -z-20 bg-[radial-gradient(120%_120%_at_10%_-20%,var(--brand-1)/0.12,transparent_68%)]"
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(120%_120%_at_90%_-10%,var(--brand-3)/0.14,transparent_70%)]"
          />
          <div className="mx-auto max-w-3xl space-y-5 text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-1)]">
              Earning opportunities
            </span>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Actions that unlock the biggest reward streaks
            </h2>
            <p className="text-sm text-muted-foreground">
              The ledger spotlights the rules that keep Shipyard signal-rich.
              Hit these consistently to make every redemption within reach.
            </p>
          </div>
          <div className={earningGridClass}>
            {rewardRules.length > 0 ? (
              rewardRules.map((rule) => {
                const hasDailyCap =
                  typeof rule.dailyCap === "number" && rule.dailyCap > 0
                const hasLifetimeCap =
                  typeof rule.lifetimeCap === "number" && rule.lifetimeCap > 0
                const baseAward =
                  typeof rule.baseRewardAmount === "number"
                    ? rule.baseRewardAmount
                    : 0
                const totalAwardedRewardAmount =
                  typeof rule.totalAwarded === "number" ? rule.totalAwarded : 0
                const payoutCount =
                  typeof rule.awardCount === "number" ? rule.awardCount : 0
                const streakLabel =
                  payoutCount === 1
                    ? "Streak awarded (90d)"
                    : "Streaks awarded (90d)"
                return (
                  <article
                    key={rule.id}
                    className="group relative flex w-full max-w-sm flex-col gap-6 overflow-hidden rounded-[28px] bg-white/70 px-7 py-8 text-left shadow-[0px_40px_120px_-60px_rgba(7,58,104,0.5)] backdrop-blur ring-1 ring-[rgba(7,58,104,0.08)]"
                  >
                    <div
                      aria-hidden
                      className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-[color:var(--brand-1)/0] via-[color:var(--brand-1)/0.45] to-[color:var(--brand-2)/0]"
                    />

                    <div className="space-y-3">
                      <Badge
                        variant="secondary"
                        className="w-fit uppercase tracking-[0.18em] text-[10px]"
                      >
                        {ruleCategoryLabels[rule.category]}
                      </Badge>
                      <h3 className="text-lg font-semibold text-foreground text-balance">
                        {rule.name}
                      </h3>
                      {rule.description ? (
                        <p className="text-sm text-muted-foreground text-balance">
                          {rule.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-3 text-sm text-muted-foreground">
                      <div className="flex items-center justify-between text-foreground">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                          Earn reward
                        </span>
                        <span className="text-lg font-semibold text-foreground">
                          {formatRewards(baseAward)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground/80">
                        <span>Rewards awarded (90d)</span>
                        <span className="font-semibold text-foreground">
                          {formatRewards(totalAwardedRewardAmount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground/80">
                        <span>Payouts triggered</span>
                        <span className="font-semibold text-foreground">
                          {formatNumber(payoutCount)}
                        </span>
                      </div>
                      {hasDailyCap ? (
                        <div className="flex items-center justify-between text-xs text-muted-foreground/80">
                          <span>Daily cap</span>
                          <span className="font-semibold text-foreground">
                            {formatNumber(rule.dailyCap ?? 0)}
                          </span>
                        </div>
                      ) : null}
                      {hasLifetimeCap ? (
                        <div className="flex items-center justify-between text-xs text-muted-foreground/80">
                          <span>Lifetime cap</span>
                          <span className="font-semibold text-foreground">
                            {formatNumber(rule.lifetimeCap ?? 0)}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground/80">
                      <span className="font-semibold text-[color:var(--brand-1)]">
                        {formatNumber(payoutCount)}
                      </span>
                      <span>{streakLabel}</span>
                    </div>
                  </article>
                )
              })
            ) : (
              <div className="col-span-full rounded-[28px] border border-dashed border-[color:var(--brand-1)/0.16] bg-white/70 px-6 py-12 text-center text-sm text-muted-foreground backdrop-blur">
                We&apos;ll spotlight the top earn rules as soon as the first
                streaks land.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden py-16">
        <div className="mx-auto max-w-[84rem] px-4 md:px-8">
          <div
            aria-hidden
            className="absolute inset-0 -z-20 bg-[radial-gradient(120%_120%_at_0%_0%,var(--brand-1)/0.12,transparent_70%)]"
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(100%_140%_at_100%_-20%,var(--brand-2)/0.12,transparent_68%)]"
          />
          <div className="mx-auto max-w-3xl space-y-5 text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-1)]">
              Redeem the momentum
            </span>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Premium exposure without a paid plan
            </h2>
            <p className="text-sm text-muted-foreground">
              Catalog items mirror the perks available to Shipyard
              teams—homepage features, analytics, promos, and utility boosts.
              Queue them up as soon as your balance is ready.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {rewardsCatalog.length > 0 ? (
              rewardsCatalog.map((reward) => {
                const durationLabel = formatDuration(reward.durationSeconds)
                const limitBadges = [
                  reward.maxActivePerUser != null && reward.maxActivePerUser > 1
                    ? `Active limit: ${formatNumber(reward.maxActivePerUser)}`
                    : null,
                  reward.maxPendingPerUser != null &&
                  reward.maxPendingPerUser > 2
                    ? `Pending limit: ${formatNumber(reward.maxPendingPerUser)}`
                    : null,
                ].filter(Boolean)

                return (
                  <article
                    key={reward.featureKey}
                    className="group relative flex h-full flex-col justify-between overflow-hidden rounded-[28px] bg-white/70 px-7 py-8 text-left shadow-[0px_42px_130px_-60px_rgba(7,58,104,0.52)] backdrop-blur ring-1 ring-[rgba(7,58,104,0.08)]"
                  >
                    <div
                      aria-hidden
                      className="absolute inset-x-7 top-0 h-px bg-gradient-to-r from-[color:var(--brand-2)/0] via-[color:var(--brand-2)/0.45] to-[color:var(--brand-3)/0]"
                    />
                    <div className="space-y-3">
                      <Badge
                        variant="secondary"
                        className="w-fit uppercase tracking-[0.18em] text-[10px]"
                      >
                        {rewardCategoryLabels[reward.category]}
                      </Badge>
                      <h3 className="text-lg font-semibold text-foreground">
                        {reward.name}
                      </h3>
                      {reward.description ? (
                        <p className="text-sm text-muted-foreground">
                          {reward.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="mt-6 space-y-3 text-sm text-muted-foreground">
                      <div className="flex items-center justify-between text-foreground">
                        <span className="text-base font-semibold text-foreground">
                          {formatRewards(reward.baseCost)}
                        </span>
                        <span className="text-xs text-muted-foreground/80">
                          {formatNumber(reward.redemptionCount)} redeems (90d)
                        </span>
                      </div>
                      {durationLabel ? (
                        <div className="text-xs text-muted-foreground/80">
                          {durationLabel}
                        </div>
                      ) : null}
                      {limitBadges.length ? (
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground/80">
                          {limitBadges.map((badge) => (
                            <span
                              key={badge}
                              className="rounded-full bg-[color:var(--brand-1)/0.08] px-3 py-1 font-medium text-[color:var(--brand-1)]"
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </article>
                )
              })
            ) : (
              <div className="col-span-full rounded-[28px] border border-dashed border-[color:var(--brand-1)/0.16] bg-white/70 px-6 py-12 text-center text-sm text-muted-foreground backdrop-blur">
                Rewards will populate here once the catalog opens to the public.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden py-16">
        <div className="mx-auto max-w-[84rem] px-4 md:px-8">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(120%_120%_at_50%_-30%,var(--brand-1)/0.14,transparent_68%)]"
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-20 bg-[radial-gradient(120%_160%_at_50%_120%,var(--brand-3)/0.12,transparent_72%)]"
          />
          <div className="relative overflow-hidden rounded-[36px] bg-white/70 px-8 py-12 shadow-[0px_48px_140px_-70px_rgba(7,58,104,0.6)] backdrop-blur ring-1 ring-[rgba(7,58,104,0.08)] sm:px-12">
            <div
              aria-hidden
              className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-[color:var(--brand-1)/0] via-[color:var(--brand-1)/0.35] to-[color:var(--brand-2)/0]"
            />
            <div className="grid gap-8 lg:grid-cols-[1.2fr,0.8fr] lg:items-center">
              <div className="space-y-4">
                <h3 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  Ready to turn participation into prime placement?
                </h3>
                <p className="text-sm text-muted-foreground">
                  Shipyard rewards give every builder a path to front-page
                  visibility. Keep the streak alive, monitor the ledger, and
                  swap rewards for exposure when your next launch is ready.
                </p>
              </div>
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-end">
                <Link
                  href={MEMBER_PRODUCTS_PATH}
                  className={launchPrimaryButton({ size: "lg" })}
                >
                  List your product
                </Link>
                <Link
                  href={MEMBER_REWARDS_PATH}
                  className={launchSecondaryButton({
                    size: "lg",
                    className:
                      "bg-[color:var(--brand-1)/0.08] text-[color:var(--brand-1)] hover:bg-[color:var(--brand-1)/0.12] hover:text-[color:var(--brand-1)] focus-visible:ring-offset-white",
                  })}
                >
                  Review your ledger
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
