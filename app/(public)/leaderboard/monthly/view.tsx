import Link from "next/link"

import {
  getMonthlyLeaderboardMonths,
  getMonthlyTopRankedProducts,
} from "@/actions/public/leaderboard/actions"
import { Button } from "@/components/atoms/button"
import { Badge } from "@/components/atoms/badge"
import PublicContainer from "@/components/layout/PublicContainer"
import { ProductCompactGrid } from "@/components/molecules/ProductCompactGrid"
import { TopPlacementCard } from "@/components/molecules/LeaderboardTopPlacement"
import { MonthlyLeaderboardMonthSelect } from "./month-select"
import {
  BROWSE_PATH,
  LEADERBOARD_PATH,
  LEADERBOARD_MONTHLY_PATH,
} from "@/lib/routes"
import { IconAnchor, IconCalendar } from "@tabler/icons-react"

const rankLabels = ["Monthly Flagship", "First Mate", "Deckhand"]

type MonthlyLeaderboardData = Awaited<
  ReturnType<typeof getMonthlyTopRankedProducts>
>

type MonthlyRanking = MonthlyLeaderboardData["rankings"][number]

export async function MonthlyLeaderboardView({
  monthParam,
  initialLeaderboard,
}: {
  monthParam?: string
  initialLeaderboard?: MonthlyLeaderboardData
}) {
  const [months, leaderboard] = await Promise.all([
    getMonthlyLeaderboardMonths(),
    initialLeaderboard ?? getMonthlyTopRankedProducts({ month: monthParam }),
  ])

  const topThree: MonthlyRanking[] = leaderboard.rankings.slice(0, 3)
  const firstPlacement = topThree[0]
  const runnerUps: MonthlyRanking[] = topThree.slice(1)
  const rest: MonthlyRanking[] = leaderboard.rankings.slice(3)
  const hasRankings = leaderboard.rankings.length > 0

  return (
    <main className="relative isolate overflow-hidden bg-white">

      <PublicContainer
        as="section"
        max="marketing"
        paddingY="py-24"
        fillScreen={false}
        className="relative"
      >
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brand-2)/0.35] bg-background/80 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-2)] shadow-sm backdrop-blur">
            Monthly Winners
          </span>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Champions of {leaderboard.label}
            </h1>
            <p className="text-lg text-muted-foreground">
              Each month we capture the products that rallied the most support.
              Explore the hall of fame and revisit previous victors.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <MonthlyLeaderboardMonthSelect
              months={months}
              selected={leaderboard.month}
            />
            <Button asChild variant="outline" size="sm">
              <Link href={LEADERBOARD_PATH}>View live leaderboard</Link>
            </Button>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--brand-1)/0.2] bg-background/85 px-4 py-3 text-sm text-muted-foreground shadow-[0px_25px_55px_-40px_rgba(7,58,104,0.55)] backdrop-blur">
            <IconCalendar className="h-4 w-4 text-[color:var(--brand-1)]" />
            <span>
              {leaderboard.rankings.length} product
              {leaderboard.rankings.length === 1 ? "" : "s"} earned a rank in{" "}
              {leaderboard.label}.
            </span>
          </div>
        </div>
      </PublicContainer>

      {hasRankings ? (
        <>
          <PublicContainer
            as="section"
            max="marketing"
            paddingY="py-14"
            fillScreen={false}
            className="relative"
          >
            <div className="flex flex-col gap-6">
              {firstPlacement ? (
                <TopPlacementCard
                  key={firstPlacement.id}
                  product={firstPlacement.product}
                  rank={firstPlacement.rank}
                  label={rankLabels[0] ?? "Top 1"}
                  upvotesOverride={firstPlacement.upvotes}
                  upvotesLabel="monthly upvotes"
                  meta={
                    firstPlacement.score != null ? (
                      <Badge
                        variant="outline"
                        className="px-3 py-1 text-[10px] uppercase tracking-[0.3em]"
                      >
                        Score {firstPlacement.score.toLocaleString()}
                      </Badge>
                    ) : undefined
                  }
                />
              ) : null}

              {runnerUps.length ? (
                <div className="grid gap-6 md:grid-cols-2">
                  {runnerUps.map((entry, index) => (
                    <TopPlacementCard
                      key={entry.id}
                      product={entry.product}
                      rank={entry.rank}
                      label={rankLabels[index + 1] ?? `Top ${index + 2}`}
                      upvotesOverride={entry.upvotes}
                      upvotesLabel="monthly upvotes"
                      meta={
                        entry.score != null ? (
                          <Badge
                            variant="outline"
                            className="px-3 py-1 text-[10px] uppercase tracking-[0.3em]"
                          >
                            Score {entry.score.toLocaleString()}
                          </Badge>
                        ) : undefined
                      }
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </PublicContainer>

          {rest.length ? (
            <PublicContainer
              as="section"
              max="marketing"
              paddingY="py-12"
              fillScreen={false}
              className="relative"
            >
              <div className="rounded-3xl border border-[color:var(--brand-1)/0.16] bg-background/90 px-5 py-6 shadow-[0px_28px_80px_-55px_rgba(7,58,104,0.6)] backdrop-blur">
                <ProductCompactGrid
                  items={rest.map((entry) => ({
                    id: entry.product.id,
                    slug: entry.product.slug,
                    name: entry.product.name,
                    logo: entry.product.logo,
                    tagline: entry.product.tagline,
                    analytics: {
                      upvotes:
                        entry.upvotes ?? entry.product.analytics?.upvotes ?? 0,
                    },
                    category: entry.product.category ?? undefined,
                    rank: entry.rank,
                    score: entry.score,
                  }))}
                  columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                  className="gap-y-6"
                  renderMeta={(item) => (
                    <Badge variant="secondary" className="px-2 py-0.5 text-xs">
                      #{item.rank}
                    </Badge>
                  )}
                  showCategory
                />
              </div>
            </PublicContainer>
          ) : null}
        </>
      ) : (
        <PublicContainer
          as="section"
          max="marketing"
          paddingY="py-24"
          fillScreen={false}
          className="relative"
        >
          <div className="flex flex-col items-center gap-4 text-center text-muted-foreground">
            <IconAnchor className="h-10 w-10 text-[color:var(--brand-1)]" />
            <div className="space-y-2">
              <p className="text-lg font-semibold text-foreground">
                No rankings recorded yet.
              </p>
              <p className="text-sm text-muted-foreground">
                As soon as makers start charting this period, their victories
                will appear here.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href={BROWSE_PATH}>Discover products</Link>
            </Button>
          </div>
        </PublicContainer>
      )}

      <PublicContainer
        as="section"
        max="marketing"
        paddingY="py-16"
        fillScreen={false}
        className="relative"
      >
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 rounded-3xl border border-[color:var(--brand-1)/0.18] bg-background/82 px-8 py-12 text-center shadow-[0px_32px_90px_-60px_rgba(7,58,104,0.55)] backdrop-blur">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Ready to capture next month’s crown?
          </h2>
          <p className="text-muted-foreground">
            Launch or update your product to rally the community and climb the
            live leaderboard. Every vote counts when the month resets.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href={LEADERBOARD_MONTHLY_PATH}>Review other months</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={LEADERBOARD_PATH}>Track live standings</Link>
            </Button>
          </div>
        </div>
      </PublicContainer>
    </main>
  )
}
