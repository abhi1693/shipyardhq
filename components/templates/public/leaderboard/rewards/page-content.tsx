import Link from "next/link"
import {
  ArrowRight,
  ShoppingCart,
  Sparkles,
  Trophy,
  Users,
  WalletCards,
} from "lucide-react"

import { getPartnerSpotlightProducts } from "@/actions/public/products/featured"
import {
  getPublicRewardsStats,
  getRewardsLeaderboardPage,
} from "@/actions/public/rewards/actions"
import { RewardsLeaderboardClient } from "@/components/templates/public/leaderboard/rewards/leaderboard-client"
import { PromotedShips } from "@/components/templates/public/leaderboard/promoted-ships"
import {
  LEADERBOARD_PATH,
  MEMBER_PRODUCTS_PATH,
  MEMBER_REWARDS_PATH,
} from "@/lib/routes"
import { cn } from "@/lib/utils"
import { formatNumber, formatRewards } from "@/lib/rewards/format"

const leaderboardMetrics = [
  {
    key: "membersWithRewards",
    label: "Members earning",
    formatter: formatNumber,
    helper: "Community earners",
    Icon: Users,
  },
  {
    key: "activeBalances",
    label: "Active balances",
    formatter: formatNumber,
    helper: "Ready to redeem",
    Icon: WalletCards,
  },
  {
    key: "earnedLast30d",
    label: "Rewards earned (30d)",
    formatter: formatRewards,
    helper: "Recent velocity",
    Icon: Trophy,
  },
  {
    key: "spentLast30d",
    label: "Rewards redeemed (30d)",
    formatter: formatRewards,
    helper: "Launch boosts",
    Icon: ShoppingCart,
  },
] as const

export async function RewardsLeaderboardPageContent({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  searchParams: _searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const [stats, leaderboardPage, partnerSpotlightProducts] = await Promise.all([
    getPublicRewardsStats(),
    getRewardsLeaderboardPage({ page: 1 }),
    getPartnerSpotlightProducts(1),
  ])

  const {
    items: entries,
    page,
    pageSize,
    hasMore,
    nextPage,
    total,
  } = leaderboardPage

  const headerStats = {
    membersWithRewards: stats.membersWithRewards,
    activeBalances: stats.activeBalances,
    earnedLast30d: stats.earnedLast30d.rewardAmount,
    spentLast30d: stats.spentLast30d.rewardAmount,
  }

  return (
    <main className="bg-[#f8f9ff] px-4 pb-20 pt-10 text-[#0b1c30] md:px-6">
      <div className="mx-auto max-w-[1200px]">
        <header className="mx-auto max-w-3xl py-10 text-center md:py-12">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[#0051d5] shadow-[0_18px_42px_-30px_rgba(0,81,213,0.55)]">
            <Trophy className="h-7 w-7" aria-hidden />
          </span>
          <h1 className="mt-5 text-[32px] font-bold leading-10 tracking-tight text-black md:text-[40px] md:leading-[48px]">
            Rewards Leaderboard
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-[16px] leading-6 text-[#43474c]">
            Tracking the top contributors, product hunters, and high-performance
            builders earning momentum across the Shipyard ecosystem.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href={MEMBER_REWARDS_PATH}
              prefetch={false}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-black px-6 text-[12px] font-semibold uppercase tracking-[0.05em] text-white transition hover:bg-black/90 active:scale-[0.98]"
            >
              <WalletCards className="h-4 w-4" aria-hidden />
              Check your balance
            </Link>
            <Link
              href={MEMBER_PRODUCTS_PATH}
              prefetch={false}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-6 text-[12px] font-semibold uppercase tracking-[0.05em] text-black transition hover:bg-[#F8FAFC] active:scale-[0.98]"
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              Submit product
            </Link>
          </div>
        </header>

        <section
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
          aria-label="Rewards leaderboard metrics"
        >
          {leaderboardMetrics.map(({ key, label, formatter, helper, Icon }) => (
            <article
              key={key}
              className="rounded-xl border border-[#E2E8F0] bg-white p-6"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="text-[12px] font-semibold uppercase leading-4 tracking-[0.05em] text-[#43474c]">
                  {label}
                </p>
                <Icon className="h-5 w-5 text-[#0051d5]" aria-hidden />
              </div>
              <p className="mt-3 text-[24px] font-semibold leading-8 tracking-tight text-black">
                {formatter(headerStats[key])}
              </p>
              <p
                className={cn(
                  "mt-2 text-[12px] leading-4",
                  key === "spentLast30d" ? "text-[#F97316]" : "text-[#16a34a]",
                )}
              >
                {helper}
              </p>
            </article>
          ))}
        </section>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <section className="lg:col-span-8">
            <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
              <div className="flex flex-col gap-4 border-b border-[#E2E8F0] bg-white p-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-[20px] font-semibold leading-7 text-black">
                    Every member on the board
                  </h2>
                  <p className="mt-1 text-[14px] leading-5 text-[#43474c]">
                    {entries.length > 0
                      ? `Showing ${total.toLocaleString()} members ranked by lifetime rewards earned.`
                      : "No members have earned Shipyard rewards yet."}
                  </p>
                </div>
                <Link
                  href={LEADERBOARD_PATH}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 text-[12px] font-semibold uppercase tracking-[0.05em] text-black transition hover:bg-white"
                >
                  Product leaderboard
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>

              {entries.length > 0 ? (
                <RewardsLeaderboardClient
                  initialEntries={entries}
                  initialPage={page}
                  pageSize={pageSize}
                  initialHasMore={hasMore}
                  initialNextPage={nextPage}
                  total={total}
                />
              ) : (
                <div className="m-6 rounded-lg border border-dashed border-[#c4c6cd] bg-[#F8FAFC] p-6 text-center text-sm leading-6 text-[#43474c]">
                  Run your first engagement, review, or launch streak to land a
                  spot on the rewards leaderboard.
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-6 lg:col-span-4">
            <PromotedShips products={partnerSpotlightProducts} />
          </aside>
        </div>
      </div>
    </main>
  )
}
