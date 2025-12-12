import { Suspense } from "react"
import Link from "next/link"
import { IconTrophy } from "@tabler/icons-react"

import {
  getPublicRewardsStats,
  getRewardsLeaderboardPage,
} from "@/actions/public/rewards/actions"
import PublicTwoColumnLayout from "@/components/layout/public/PublicTwoColumnLayout"
import { DirectorySectionHeader } from "@/components/molecules/directory/SectionHeader"
import {
  HERO_PRIMARY_BUTTON_CLASSES,
  HERO_SECONDARY_BUTTON_CLASSES,
} from "@/components/templates/public/categories/hero-button-classes"
import { RewardsLeaderboardClient } from "@/components/templates/public/leaderboard/rewards/leaderboard-client"
import {
  SponsoredProductsSection,
  SponsoredProductsSkeleton,
} from "@/components/templates/public/homepage/sponsored-products"
import {
  TrafficSidebarStats,
  TrafficSidebarStatsSkeleton,
} from "@/components/templates/public/common/TrafficSidebarStats"
import { LEADERBOARD_PATH, MEMBER_REWARDS_PATH } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { formatNumber, formatRewards } from "@/lib/rewards/format"

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
    key: "totalRedeemed",
    label: "Rewards redeemed (30d)",
    formatter: formatRewards,
  },
] as const

export async function RewardsLeaderboardPageContent({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  searchParams: _searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const [stats, leaderboardPage] = await Promise.all([
    getPublicRewardsStats(),
    getRewardsLeaderboardPage({ page: 1 }),
  ])

  const {
    items: entries,
    page,
    pageSize,
    hasMore,
    nextPage,
    total,
  } = leaderboardPage

  const headerStats: Record<
    (typeof leaderboardMetrics)[number]["key"],
    number
  > = {
    totalProducts: stats.membersWithRewards,
    totalCreators: stats.activeBalances,
    totalUpvotes: stats.earnedLast30d.rewardAmount,
    totalRedeemed: stats.spentLast30d.rewardAmount,
  }

  return (
    <main className="relative isolate bg-[#f5f7fb]">
      <PublicTwoColumnLayout
        className="pb-24 pt-12"
        mainClassName="gap-10"
        sidebarClassName="gap-6"
        main={
          <>
            <section className="rounded-3xl border border-border/40 bg-white px-6 py-12 text-center shadow-[0_32px_96px_-60px_rgba(7,58,104,0.35)] sm:px-10">
              <div className="mx-auto flex max-w-3xl flex-col items-center gap-6">
                <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-border/40 bg-muted/40 text-[color:var(--brand-1)] shadow-[0_18px_42px_-28px_rgba(7,68,134,0.35)]">
                  <IconTrophy className="h-7 w-7" />
                </span>
                <div className="space-y-4">
                  <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                    Members leading Shipyard rewards
                  </h1>
                  <p className="text-base text-muted-foreground">
                    Track the Shipyard members earning the highest lifetime
                    rewards. These standings highlight the community builders
                    whose engagement, reviews, and launch activity fuel our
                    ecosystem.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
                  <Link
                    href={MEMBER_REWARDS_PATH}
                    className={cn(
                      HERO_PRIMARY_BUTTON_CLASSES,
                      "w-full justify-center sm:w-auto",
                    )}
                  >
                    Check your balance
                  </Link>
                  <Link
                    href={LEADERBOARD_PATH}
                    className={cn(
                      HERO_SECONDARY_BUTTON_CLASSES,
                      "w-full justify-center sm:w-auto",
                    )}
                  >
                    Browse product leaderboard
                  </Link>
                </div>
                <div className="grid w-full max-w-3xl grid-cols-2 gap-4 border-t border-border/60 pt-6 sm:grid-cols-4">
                  {leaderboardMetrics.map(({ key, label, formatter }) => (
                    <div
                      key={key}
                      className="rounded-2xl border border-border/50 bg-muted/30 px-4 py-3 text-left shadow-[0_20px_70px_-60px_rgba(7,68,134,0.35)] sm:text-center"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                        {label}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-foreground sm:text-xl">
                        {formatter(headerStats[key])}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-border/50 bg-white/95 p-6 shadow-[0_20px_70px_-60px_rgba(7,68,134,0.35)] md:p-8">
              <DirectorySectionHeader
                kicker="Full standings"
                title="Every member on the board"
                description={
                  entries.length > 0
                    ? `Showing the top ${total.toLocaleString()} members ranked by lifetime rewards earned.`
                    : "No members have earned Shipyard rewards yet. Check back soon as the community gets active."
                }
              />

              {entries.length > 0 ? (
                <div className="mt-8">
                  <RewardsLeaderboardClient
                    initialEntries={entries}
                    initialPage={page}
                    pageSize={pageSize}
                    initialHasMore={hasMore}
                    initialNextPage={nextPage}
                    total={total}
                  />
                </div>
              ) : (
                <div className="mt-8 rounded-2xl border border-dashed border-border/60 bg-background/80 p-6 text-center text-sm text-muted-foreground">
                  Run your first engagement, review, or launch streak to land a
                  spot on the rewards leaderboard.
                </div>
              )}
            </section>
          </>
        }
        sidebar={
          <>
            <Suspense fallback={<TrafficSidebarStatsSkeleton />}>
              <TrafficSidebarStats />
            </Suspense>
            <Suspense
              fallback={
                <div className="hidden lg:block">
                  <SponsoredProductsSkeleton />
                </div>
              }
            >
              <div className="hidden lg:block">
                <SponsoredProductsSection />
              </div>
            </Suspense>
          </>
        }
      />
    </main>
  )
}
