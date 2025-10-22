import Link from "next/link"
import { formatDistanceToNow } from "date-fns"

import {
  getPublicRewardsStats,
  getRewardsLeaderboardEntries,
} from "@/actions/public/rewards/actions"
import { RewardLeaderboardLimitSelect } from "@/app/(public)/leaderboard/rewards/limit-select"
import DirectoryHeader from "@/components/organisms/directory/DirectoryHeader"
import { DirectorySectionHeader } from "@/components/molecules/directory/SectionHeader"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/atoms/avatar"
import { buildPageMetadata } from "@/lib/metadata"
import {
  LEADERBOARD_PATH,
  LEADERBOARD_REWARDS_PATH,
  MEMBER_PRODUCTS_PATH,
  MEMBER_REWARDS_PATH,
  REWARDS_PATH,
  userPath,
} from "@/lib/routes"
import {
  hydrateRewardsLeaderboardEntries,
  type RewardsLeaderboardDisplayEntry,
} from "@/lib/rewards/display"
import { cn } from "@/lib/utils"
import {
  normalizeRewardsLeaderboardLimit,
  REWARDS_LEADERBOARD_DEFAULT_LIMIT,
} from "@/lib/rewards/leaderboard"

export const revalidate = 120

export const metadata = buildPageMetadata({
  title: "Rewards Leaderboard — Shipyard",
  description:
    "See which Shipyard members have earned the most rewards from community activity, engagement streaks, and launch momentum.",
  openGraph: {
    url: LEADERBOARD_REWARDS_PATH,
    type: "website",
  },
  twitter: {
    card: "summary",
  },
})

const numberFormatter = new Intl.NumberFormat("en-US")

function formatNumber(value: number) {
  return numberFormatter.format(value)
}

function formatRewards(value: number) {
  return `${formatNumber(value)} rewards`
}

function formatLaunches(count: number) {
  if (count === 1) return "1 launch shipped"
  return `${formatNumber(count)} launches shipped`
}

function formatRelativeTime(date: Date | null) {
  if (!date) return null
  return formatDistanceToNow(date, { addSuffix: true })
}

const leaderboardMetrics = [
  {
    key: "totalProducts",
    label: "Members earning",
    formatter: formatNumber,
  },
  {
    key: "totalCreators",
    label: "Active balances",
    formatter: formatNumber,
  },
  {
    key: "totalUpvotes",
    label: "Rewards earned (30d)",
    formatter: formatRewards,
  },
  {
    key: "totalInsights",
    label: "Rewards redeemed (30d)",
    formatter: formatRewards,
  },
] as const

type DisplayEntry = RewardsLeaderboardDisplayEntry

export async function RewardsLeaderboardPageContent({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = (await searchParams) ?? {}
  const rawLimitParam = sp.limit
  const limitInput = Array.isArray(rawLimitParam)
    ? rawLimitParam[0]
    : rawLimitParam
  const limit = normalizeRewardsLeaderboardLimit(
    limitInput ? Number(limitInput) : REWARDS_LEADERBOARD_DEFAULT_LIMIT,
  )

  const [stats, leaderboard] = await Promise.all([
    getPublicRewardsStats(),
    getRewardsLeaderboardEntries(limit),
  ])

  const entries = await hydrateRewardsLeaderboardEntries(leaderboard)

  const topThree = entries.slice(0, 3)
  const rest = entries.slice(3)
  const topEntry = entries[0]
  const hasRest = rest.length > 0
  const listEntries = hasRest ? rest : entries
  const listOffset = hasRest ? topThree.length : 0

  const headerStats = {
    totalProducts: stats.membersWithRewards,
    totalCreators: stats.activeBalances,
    totalUpvotes: stats.earnedLast30d.rewardAmount,
    topScore: topEntry?.lifetimeEarned ?? 0,
    totalInsights: stats.spentLast30d.rewardAmount,
  }

  return (
    <main className="relative isolate bg-white">
      <div className="relative mx-auto w-full max-w-[120rem] px-4 pb-24 pt-12 md:px-8">
        <div className="space-y-12">
          <DirectoryHeader
            stats={headerStats}
            eyebrow="Rewards leaderboard"
            title="Members leading Shipyard rewards"
            description="Track the Shipyard members earning the highest lifetime rewards. These standings highlight the community builders whose engagement, reviews, and launch activity fuel our ecosystem."
            primaryAction={{
              label: "Check your balance",
              href: MEMBER_REWARDS_PATH,
            }}
            secondaryAction={{
              label: "Browse product leaderboard",
              href: LEADERBOARD_PATH,
              variant: "outline",
            }}
            metrics={leaderboardMetrics}
          />

          <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,1.05fr)]">
            <div className="flex flex-col gap-10">
              {topThree.length > 0 ? (
                <section className="rounded-3xl border border-border/80 bg-background/75 p-6 shadow-sm shadow-black/5 md:p-8">
                  <DirectorySectionHeader
                    kicker="Top earners"
                    title="Lifetime rewards leaders"
                    description="The Shipyard members with the highest lifetime rewards earned from reviews, upvotes, streaks, and launch achievements."
                  />

                  <div className="mt-8 grid gap-5 md:grid-cols-3">
                    {topThree.map((entry, index) => (
                      <RewardLeaderCard
                        key={entry.userId}
                        entry={entry}
                        rank={index + 1}
                        variant="highlight"
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="rounded-3xl border border-border/80 bg-background/75 p-6 shadow-sm shadow-black/5 md:p-8">
                <DirectorySectionHeader
                  kicker="Full standings"
                  title="Every member on the board"
                  description={
                    entries.length > 0
                      ? `Showing the top ${entries.length.toLocaleString()} members ranked by lifetime rewards earned.`
                      : "No members have earned Shipyard rewards yet. Check back soon as the community gets active."
                  }
                  action={
                    entries.length > 0 ? (
                      <div className="w-36">
                        <RewardLeaderboardLimitSelect limit={limit} />
                      </div>
                    ) : undefined
                  }
                />

                {entries.length > 0 ? (
                  <div className="mt-8 space-y-4">
                    {listEntries.map((entry, index) => (
                      <RewardLeaderRow
                        key={entry.userId}
                        entry={entry}
                        rank={listOffset + index + 1}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="mt-8 rounded-2xl border border-dashed border-border/60 bg-background/80 p-6 text-center text-sm text-muted-foreground">
                    Run your first engagement, review, or launch streak to land
                    a spot on the rewards leaderboard.
                  </div>
                )}
              </section>
            </div>

            <aside className="flex flex-col gap-8">
              <div className="rounded-3xl border border-border/70 bg-background/80 p-6 shadow-sm shadow-black/5">
                <h3 className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  Rewards playbook
                </h3>
                <p className="mt-3 text-lg font-semibold text-foreground">
                  Earn rewards, then upgrade your launch
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Explore how Shipyard rewards work, the actions that pay out,
                  and the placements you can unlock with your balance.
                </p>
                <div className="mt-4 flex flex-col gap-2 text-sm font-semibold text-[color:var(--brand-1)]">
                  <Link href={REWARDS_PATH} className="hover:underline">
                    Learn how rewards work
                  </Link>
                  <Link href={MEMBER_PRODUCTS_PATH} className="hover:underline">
                    Launch a product
                  </Link>
                </div>
              </div>

              {topEntry ? (
                <div className="rounded-3xl border border-border/70 bg-background/80 p-6 shadow-sm shadow-black/5">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                    Spotlight
                  </h3>
                  <p className="mt-3 text-lg font-semibold text-foreground">
                    {topEntry.displayName} leads with{" "}
                    {formatRewards(topEntry.lifetimeEarned)}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Join them by contributing thoughtful reviews, verifying
                    traction, and keeping your launch streak alive.
                  </p>
                  <Link
                    href={userPath(topEntry.userId)}
                    className="mt-4 inline-flex items-center text-sm font-semibold text-[color:var(--brand-1)] hover:underline"
                  >
                    View profile
                  </Link>
                </div>
              ) : null}
            </aside>
          </div>
        </div>
      </div>
    </main>
  )
}

function RewardLeaderRow({
  entry,
  rank,
}: {
  entry: DisplayEntry
  rank: number
}) {
  return (
    <Link
      href={userPath(entry.userId)}
      className={cn(
        "group relative flex flex-col gap-5 rounded-3xl border border-border/70 bg-white/80 p-5 shadow-sm shadow-black/5 transition-transform duration-200 hover:-translate-y-1 hover:border-[color:var(--brand-1)/0.26]",
      )}
    >
      <div className="flex flex-wrap items-center gap-4">
        <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-[color:var(--brand-1)/0.28] bg-[color:var(--brand-1)/0.08] px-3 text-sm font-semibold text-[color:var(--brand-1)]">
          #{rank}
        </span>
        <Avatar className="h-12 w-12 bg-muted/60 text-base font-semibold text-foreground shadow-[0_18px_40px_-32px_rgba(7,58,104,0.6)]">
          {entry.avatarUrl ? (
            <AvatarImage
              src={entry.avatarUrl}
              alt={entry.displayName}
              width={48}
              height={48}
              className="object-cover"
            />
          ) : null}
          <AvatarFallback>{entry.initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-foreground">
            {entry.displayName}
          </p>
          <p className="text-sm text-muted-foreground">
            {formatLaunches(entry.launchCount)}
          </p>
        </div>
        <div className="ml-auto text-right text-sm text-muted-foreground">
          <p>Balance {formatRewards(entry.balance)}</p>
          {entry.lastEarnedAt ? (
            <p>Last earned {formatRelativeTime(entry.lastEarnedAt)}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Lifetime rewards
          </p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {formatRewards(entry.lifetimeEarned)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span>Spent {formatRewards(entry.lifetimeSpent)}</span>
          <span>Refunded {formatRewards(entry.lifetimeRefunded)}</span>
        </div>
      </div>
    </Link>
  )
}

function RewardLeaderCard({
  entry,
  rank,
  variant = "default",
}: {
  entry: DisplayEntry
  rank: number
  variant?: "default" | "highlight"
}) {
  const highlight = variant === "highlight"
  const avatarSize = highlight ? 56 : 48

  return (
    <Link
      href={userPath(entry.userId)}
      className={cn(
        "group relative flex h-full flex-col justify-between gap-6 rounded-3xl border border-border/70 bg-white/85 p-6 shadow-sm shadow-black/5 transition-transform duration-200 hover:-translate-y-1 hover:border-[color:var(--brand-1)/0.26]",
        highlight
          ? "border-[color:var(--brand-1)/0.35] bg-[radial-gradient(120%_120%_at_90%_0%,var(--brand-1)/0.12,transparent_60%),radial-gradient(120%_120%_at_0%_100%,var(--brand-2)/0.12,transparent_70%)]"
          : "",
      )}
    >
      <div className="flex items-center gap-4">
        <span
          className={cn(
            "inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-[color:var(--brand-1)/0.28] bg-[color:var(--brand-1)/0.08] px-3 text-sm font-semibold text-[color:var(--brand-1)]",
            highlight ? "h-10 min-w-10 text-base" : "",
          )}
        >
          #{rank}
        </span>
        <Avatar
          className={cn(
            "h-12 w-12 bg-muted/60 text-base font-semibold text-foreground shadow-[0_18px_40px_-32px_rgba(7,58,104,0.6)]",
            highlight ? "h-14 w-14 text-lg" : "",
          )}
        >
          {entry.avatarUrl ? (
            <AvatarImage
              src={entry.avatarUrl}
              alt={entry.displayName}
              width={avatarSize}
              height={avatarSize}
              className="object-cover"
            />
          ) : null}
          <AvatarFallback>{entry.initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-foreground">
            {entry.displayName}
          </p>
          <p className="text-sm text-muted-foreground">
            {formatLaunches(entry.launchCount)}
          </p>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          Lifetime rewards earned
        </p>
        <p className="mt-2 text-3xl font-semibold text-foreground">
          {formatRewards(entry.lifetimeEarned)}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span>Balance {formatRewards(entry.balance)}</span>
        <span>Spent {formatRewards(entry.lifetimeSpent)}</span>
        {entry.lastEarnedAt ? (
          <span>Last earned {formatRelativeTime(entry.lastEarnedAt)}</span>
        ) : null}
      </div>
    </Link>
  )
}
