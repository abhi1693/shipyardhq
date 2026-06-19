import Link from "next/link"
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  CreditCard,
  Eye,
  History,
  Link2,
  LogIn,
  Megaphone,
  Medal,
  MessageSquare,
  Newspaper,
  Pin,
  Rocket,
  Sparkles,
  Star,
  ThumbsUp,
  Trophy,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react"

import {
  getPublicRewardsData,
  type PublicRewardsReward,
  type PublicRewardsRule,
} from "@/actions/public/rewards/actions"
import {
  LEADERBOARD_REWARDS_PATH,
  MEMBER_PRODUCTS_ADD_PATH,
  MEMBER_REWARDS_PATH,
} from "@/lib/routes"
import { cn } from "@/lib/utils"
import {
  RewardFeatureCategory,
  RewardRuleCategory,
} from "@/lib/vendor/prisma/client"

const ruleCategoryLabels: Record<RewardRuleCategory, string> = {
  [RewardRuleCategory.engagement]: "Engagement",
  [RewardRuleCategory.streak]: "Streak",
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

const numberFormatter = new Intl.NumberFormat("en-US")
const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
})

type StatCard = {
  label: string
  value: string
  helper: string
  Icon: LucideIcon
}

function formatNumber(value: number) {
  return numberFormatter.format(value)
}

function formatCompact(value: number) {
  return compactFormatter.format(value)
}

function formatCredits(value: number) {
  return `${formatNumber(value)} CR`
}

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) return null

  const hours = Math.round(seconds / 3600)
  if (hours < 24) return `Per ${hours} hour${hours === 1 ? "" : "s"}`

  const days = Math.round(hours / 24)
  if (days % 7 === 0) {
    const weeks = days / 7
    return `Per ${weeks} week${weeks === 1 ? "" : "s"}`
  }

  return `Per ${days} day${days === 1 ? "" : "s"}`
}

function ruleIconFor(rule: PublicRewardsRule): LucideIcon {
  const text = `${rule.name} ${rule.description ?? ""}`.toLowerCase()

  if (text.includes("payment") || text.includes("stripe")) return CreditCard
  if (text.includes("backlink") || text.includes("domain")) return Link2
  if (text.includes("launch") || text.includes("product")) return Rocket
  if (text.includes("login") || text.includes("check in")) return LogIn
  if (text.includes("upvote") || text.includes("vote")) return ThumbsUp
  if (text.includes("review") || text.includes("feedback")) return MessageSquare
  if (rule.category === RewardRuleCategory.streak) return History

  return Sparkles
}

function rewardIconFor(reward: PublicRewardsReward): LucideIcon {
  const text = `${reward.featureKey} ${reward.name}`.toLowerCase()

  if (text.includes("spotlight") || text.includes("banner")) return Pin
  if (text.includes("analytics")) return BarChart3
  if (text.includes("sponsor") || text.includes("promo")) return Megaphone
  if (text.includes("newsletter")) return Newspaper
  if (text.includes("badge") || text.includes("featured")) return BadgeCheck
  if (text.includes("priority") || text.includes("placement")) return Star
  if (reward.category === RewardFeatureCategory.analytics) return BarChart3

  return Trophy
}

function capLabel(rule: PublicRewardsRule) {
  if (rule.lifetimeCap && rule.lifetimeCap > 0) {
    return `Lifetime: ${formatNumber(rule.lifetimeCap)}`
  }

  if (rule.dailyCap && rule.dailyCap > 0) {
    return `Daily cap: ${formatNumber(rule.dailyCap)}`
  }

  return "Uncapped"
}

export async function RewardsPageContent() {
  const data = await getPublicRewardsData()
  const rewardRules = data.rules
  const rewardsCatalog = data.rewards
  const sponsoredReward = rewardsCatalog.find((reward) =>
    `${reward.featureKey} ${reward.name}`.toLowerCase().includes("sponsored"),
  )
  const mostRedeemedReward = rewardsCatalog.reduce<PublicRewardsReward | null>(
    (current, reward) => {
      if (!current) return reward
      if (reward.redemptionCount > current.redemptionCount) return reward
      return current
    },
    null,
  )
  const popularRewardKey =
    sponsoredReward?.featureKey ?? mostRedeemedReward?.featureKey ?? null

  const stats: StatCard[] = [
    {
      label: "Members earning",
      value: formatCompact(data.stats.membersWithRewards),
      helper: "Verified makers",
      Icon: TrendingUp,
    },
    {
      label: "Active balances",
      value: formatCompact(data.stats.activeBalances),
      helper: "Ready to spend",
      Icon: Wallet,
    },
    {
      label: "Rewards awarded",
      value: formatCompact(data.stats.earnedLast30d.rewardAmount),
      helper: "Last 30 days",
      Icon: Medal,
    },
    {
      label: "Redeemed",
      value: formatCompact(data.stats.spentLast30d.redemptions),
      helper: "Launch boosts",
      Icon: Eye,
    },
  ]

  const featureRules = rewardRules.slice(0, 4)
  const compactRules = rewardRules.slice(4, 7)

  return (
    <main className="bg-[#f8f9ff] text-[#0b1c30]">
      <section className="relative overflow-hidden bg-[#061d31] px-4 pb-48 pt-16 text-center text-white md:px-6 md:pb-16">
        <div
          aria-hidden
          className="absolute inset-0 opacity-15 [background-image:radial-gradient(circle_at_2px_2px,#ffffff_1px,transparent_0)] [background-size:40px_40px]"
        />
        <div className="relative z-10 mx-auto max-w-4xl">
          <span className="inline-flex rounded-full border border-[#c0ff00]/25 bg-[#c0ff00]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#c0ff00]">
            Shipyard Rewards
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            Turn authentic engagement into launch-grade visibility
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[#eaf1ff]/80">
            Contribute reviews, verify traction, and keep streaks alive to bank
            rewards. Swap momentum for sponsored placements and marquee
            visibility.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={MEMBER_REWARDS_PATH}
              prefetch={false}
              className="inline-flex w-full items-center justify-center rounded-full bg-white px-8 py-3 text-sm font-semibold text-black transition hover:bg-[#eff4ff] active:scale-95 sm:w-auto"
            >
              Check your balance
            </Link>
            <Link
              href={LEADERBOARD_REWARDS_PATH}
              className="inline-flex w-full items-center justify-center rounded-full border border-[#eaf1ff]/40 px-8 py-3 text-sm font-semibold text-[#eaf1ff] transition hover:bg-white/10 active:scale-95 sm:w-auto"
            >
              See leaderboard
            </Link>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-4 text-left lg:grid-cols-4">
            {stats.map(({ label, value, helper, Icon }) => (
              <article
                key={label}
                className="rounded-lg border border-white/10 bg-white/[0.06] p-6 backdrop-blur"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#dce9ff]">
                    {label}
                  </span>
                  <Icon className="h-5 w-5 text-[#c0ff00]" aria-hidden />
                </div>
                <p className="mt-4 text-2xl font-semibold tracking-tight text-white">
                  {value}
                </p>
                <p className="mt-1 text-xs text-[#dce9ff]/65">{helper}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-16 md:px-6">
        <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="block text-xs font-bold uppercase tracking-[0.24em] text-[#0051d5]">
              Earning opportunities
            </span>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
              Actions that unlock reward streaks
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-[#43474c]">
            Maintain consistent activity to multiply your earnings. Every streak
            contributes to your global visibility index.
          </p>
        </div>

        {featureRules.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {featureRules.map((rule) => {
              const Icon = ruleIconFor(rule)

              return (
                <article
                  key={rule.id}
                  className="flex h-full flex-col rounded-lg border border-white/10 bg-[#061d31] p-6 text-white transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="mb-8 flex items-start justify-between gap-3">
                    <span className="rounded-lg bg-[#c0ff00]/15 p-2 text-[#c0ff00]">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="rounded bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/80">
                      {ruleCategoryLabels[rule.category]}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold">{rule.name}</h3>
                  {rule.description ? (
                    <p className="mt-2 text-sm leading-6 text-[#dce9ff]/70">
                      {rule.description}
                    </p>
                  ) : null}
                  <div className="mt-auto border-t border-white/10 pt-5">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <span className="block text-[11px] font-medium text-[#dce9ff]/50">
                          Earn reward
                        </span>
                        <span className="text-lg font-semibold text-[#c0ff00]">
                          {formatCredits(rule.baseRewardAmount)}
                        </span>
                      </div>
                      <span className="rounded bg-white/5 px-2 py-1 text-[11px] text-[#dce9ff]/75">
                        {capLabel(rule)}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-[11px] text-[#dce9ff]/55">
                      <span>{formatCredits(rule.totalAwarded)} awarded</span>
                      <span>{formatNumber(rule.awardCount)} payouts</span>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-[#c4c6cd] bg-white px-6 py-12 text-center text-sm text-[#43474c]">
            Earning rules will appear as soon as the first reward streaks land.
          </div>
        )}

        {compactRules.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            {compactRules.map((rule) => {
              const Icon = ruleIconFor(rule)

              return (
                <article
                  key={rule.id}
                  className="flex items-center gap-5 rounded-lg border border-white/10 bg-[#061d31] p-6 text-white transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <span className="rounded-full bg-[#c0ff00]/15 p-3 text-[#c0ff00]">
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-semibold">
                      {rule.name}
                    </h3>
                    <p className="truncate text-sm text-[#dce9ff]/70">
                      {rule.description ?? ruleCategoryLabels[rule.category]}
                    </p>
                  </div>
                  <span className="shrink-0 text-right text-lg font-semibold text-[#c0ff00]">
                    {formatCredits(rule.baseRewardAmount)}
                  </span>
                </article>
              )
            })}
          </div>
        ) : null}
      </section>

      <section className="bg-[#f8fafc] px-4 py-20 md:px-6">
        <div className="mx-auto max-w-[1200px]">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <span className="block text-xs font-bold uppercase tracking-[0.24em] text-[#0051d5]">
              Redeem the momentum
            </span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              Premium exposure without a paid plan
            </h2>
            <p className="mt-4 text-sm leading-6 text-[#43474c]">
              Convert earned rewards into high-impact placements. Queue them up
              as soon as your balance is ready.
            </p>
          </div>

          {rewardsCatalog.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {rewardsCatalog.map((reward) => {
                const Icon = rewardIconFor(reward)
                const popular = reward.featureKey === popularRewardKey
                const durationLabel = formatDuration(reward.durationSeconds)

                return (
                  <article
                    key={reward.featureKey}
                    className={cn(
                      "flex min-h-72 flex-col rounded-lg border border-[#e2e8f0] bg-white p-8 transition hover:-translate-y-0.5 hover:shadow-lg",
                      popular && "border-[#0051d5]/25 bg-[#0051d5]/5",
                    )}
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <span
                        className={cn(
                          "rounded px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.18em]",
                          popular
                            ? "bg-[#0051d5] text-white"
                            : "bg-[#dce9ff] text-[#0051d5]",
                        )}
                      >
                        {popular
                          ? "Most popular"
                          : rewardCategoryLabels[reward.category]}
                      </span>
                      <Icon className="h-5 w-5 text-[#0051d5]" aria-hidden />
                    </div>
                    <h3 className="text-2xl font-semibold tracking-tight">
                      {reward.name}
                    </h3>
                    {reward.description ? (
                      <p className="mt-3 text-sm leading-6 text-[#43474c]">
                        {reward.description}
                      </p>
                    ) : null}
                    <div className="mt-auto border-t border-[#e2e8f0] pt-6">
                      <div className="flex items-end justify-between gap-4">
                        <div>
                          <span className="text-lg font-semibold text-black">
                            {formatCredits(reward.baseCost)}
                          </span>
                          <span className="block text-[11px] text-[#74777d]">
                            {durationLabel ?? "On redemption"}
                          </span>
                        </div>
                        <Link
                          href={MEMBER_REWARDS_PATH}
                          prefetch={false}
                          className="inline-flex items-center justify-center rounded-full bg-[#0051d5] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#346cef] active:scale-95"
                        >
                          Redeem
                        </Link>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-[#74777d]">
                        <span>
                          {formatNumber(reward.redemptionCount)} redeems
                        </span>
                        {reward.requiresProduct ? (
                          <span>Product required</span>
                        ) : null}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[#c4c6cd] bg-white px-6 py-12 text-center text-sm text-[#43474c]">
              Rewards will populate here once the catalog opens to the public.
            </div>
          )}
        </div>
      </section>

      <section className="px-4 py-20 md:px-6">
        <div className="mx-auto max-w-[1200px] overflow-hidden rounded-lg bg-[#061d31] p-8 text-center text-white md:p-12">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-[#c0ff00]/15 text-[#c0ff00]">
            <CheckCircle2 className="h-6 w-6" aria-hidden />
          </div>
          <h2 className="mx-auto mt-6 max-w-3xl text-3xl font-semibold tracking-tight md:text-4xl">
            Ready to turn participation into prime placement?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[#dce9ff]/75">
            Shipyard rewards give every builder a path to front-page visibility.
            Keep the streak alive, monitor the ledger, and swap rewards for
            exposure when your next launch is ready.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={MEMBER_PRODUCTS_ADD_PATH}
              prefetch={false}
              className="inline-flex w-full items-center justify-center rounded-full bg-[#c0ff00] px-8 py-3 text-sm font-bold text-black transition hover:bg-[#d6ff47] active:scale-95 sm:w-auto"
            >
              List your product
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Link>
            <Link
              href={MEMBER_REWARDS_PATH}
              prefetch={false}
              className="inline-flex w-full items-center justify-center rounded-full bg-white/10 px-8 py-3 text-sm font-bold text-white transition hover:bg-white/20 active:scale-95 sm:w-auto"
            >
              Review your ledger
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
