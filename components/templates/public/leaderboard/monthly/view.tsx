import Link from "next/link"

import {
  getMonthlyLeaderboardMonths,
  getMonthlyTopRankedProducts,
} from "@/actions/public/leaderboard/actions"
import { Badge } from "@/components/atoms/badge"
import { Button } from "@/components/atoms/button"
import { TopPlacementCard } from "@/components/molecules/LeaderboardTopPlacement"
import { MonthlyLeaderboardMonthSelect } from "@/app/(public)/leaderboard/monthly/month-select"
import {
  BROWSE_PATH,
  LEADERBOARD_PATH,
  LEADERBOARD_MONTHLY_PATH,
} from "@/lib/routes"
import { brandGradient, gradientTint } from "@/lib/ui/tints"
import { launchPrimaryButton, launchSecondaryButton } from "@/lib/ui/buttons"
import {
  IconAnchor,
  IconCalendar,
  IconTrendingUp,
  IconTrophy,
  IconUsersGroup,
} from "@tabler/icons-react"
import { DirectoryProductList } from "@/components/organisms/directory/DirectoryProductList"
import { getUsdConversionRates } from "@/lib/server/payments/currency"
import { resolveProductRevenue } from "@/lib/products/revenue"

const rankLabels = ["Top rank", "Second place", "Third place"]

const MONTHLY_PILLARS = [
  {
    icon: IconTrophy,
    title: "Celebrate standout launches",
    description:
      "Highlight the leading launch and rally the community around makers that resonated this month.",
  },
  {
    icon: IconTrendingUp,
    title: "Spot momentum shifts",
    description:
      "Compare placements with the live leaderboard and analytics dashboards to understand which experiments lifted your rank.",
  },
  {
    icon: IconUsersGroup,
    title: "Rally your team",
    description:
      "Share the recap, schedule Insights runs, and plan promotions so your team stays on top next month.",
  },
]

type MonthlyLeaderboardData = Awaited<
  ReturnType<typeof getMonthlyTopRankedProducts>
>

type MonthlyRanking = MonthlyLeaderboardData["rankings"][number]
type MonthlyLeaderboardMonths = Awaited<
  ReturnType<typeof getMonthlyLeaderboardMonths>
>

export async function MonthlyLeaderboardView({
  monthParam,
  initialLeaderboard,
  initialMonths,
}: {
  monthParam?: string
  initialLeaderboard?: MonthlyLeaderboardData
  initialMonths?: MonthlyLeaderboardMonths
}) {
  const [months, leaderboard] = await Promise.all([
    initialMonths ?? getMonthlyLeaderboardMonths(),
    initialLeaderboard ?? getMonthlyTopRankedProducts({ month: monthParam }),
  ])

  const topThree: MonthlyRanking[] = leaderboard.rankings.slice(0, 3)
  const firstPlacement = topThree[0]
  const runnerUps: MonthlyRanking[] = topThree.slice(1)
  const rest: MonthlyRanking[] = leaderboard.rankings.slice(3)
  const hasRankings = leaderboard.rankings.length > 0

  const hasNonUsdRevenue = leaderboard.rankings.some((entry: MonthlyRanking) => {
    const connector = entry.product.paymentConnector
    const currency =
      connector?.latestCurrencyCode ??
      connector?.revenueHistory?.[0]?.currencyCode
    return currency && currency.toUpperCase() !== "USD"
  })
  const rates = hasNonUsdRevenue ? await getUsdConversionRates() : undefined
  const resolveEntryRevenue = (entry: MonthlyRanking) =>
    resolveProductRevenue(
      entry.product.paymentConnector,
      rates
        ? {
            rates,
            targetCurrency: "USD",
          }
        : {},
    )

  return (
    <main className="relative isolate overflow-hidden bg-white">
      <section
        className={brandGradient(
          "relative overflow-hidden border border-[color:var(--brand-1)/0.18] py-24 shadow-[0px_60px_140px_-60px_rgba(18,66,112,0.7)]",
        )}
      >
        <div className="relative mx-auto flex max-w-[84rem] flex-col items-center gap-10 px-4 text-center text-white md:px-8">
          <span
            className={gradientTint(
              "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.32em] text-white/80",
            )}
          >
            Monthly leaderboard
          </span>
          <div className="max-w-3xl space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Champions of {leaderboard.label}
            </h1>
            <p className="text-lg text-white/85">
              Each reset captures the launches that earned the most support.
              Explore the archive, benchmark results with Analytics, and plan
              your next spotlight with Insights at the ready.
            </p>
          </div>
          <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <div className="w-full sm:w-auto">
              <MonthlyLeaderboardMonthSelect
                months={months}
                selected={leaderboard.month}
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={LEADERBOARD_PATH}
                className={launchPrimaryButton({ size: "lg" })}
              >
                View live leaderboard
              </Link>
              <Link
                href={BROWSE_PATH}
                className={launchSecondaryButton({
                  size: "lg",
                  className: "text-white/90 hover:text-white",
                })}
              >
                Discover launches
              </Link>
            </div>
          </div>
          <div
            className={gradientTint(
              "inline-flex items-center gap-3 rounded-2xl px-5 py-3 text-sm text-white/85 shadow-[0px_25px_60px_-45px_rgba(7,58,104,0.7)] backdrop-blur",
            )}
          >
            <IconCalendar className="h-4 w-4 text-white/85" />
            <span>
              {leaderboard.rankings.length} product
              {leaderboard.rankings.length === 1 ? "" : "s"} earned a rank in{" "}
              {leaderboard.label}.
            </span>
          </div>
        </div>
      </section>

      {hasRankings ? (
        <>
          <section className="relative py-16">
            <div className="mx-auto max-w-[84rem] px-4 md:px-8">
              <div className="flex flex-col gap-8">
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
            </div>
          </section>

          {rest.length ? (
            <section className="relative py-16">
              <div className="mx-auto max-w-[84rem] px-4 md:px-8">
                <div className="rounded-3xl border border-[color:var(--brand-1)/0.16] bg-background/90 px-5 py-6 shadow-[0px_28px_80px_-55px_rgba(7,58,104,0.6)] backdrop-blur">
                  <DirectoryProductList
                    items={rest.map((entry) => {
                      const revenue = resolveEntryRevenue(entry)
                      return {
                        id: entry.product.id,
                        slug: entry.product.slug,
                        name: entry.product.name,
                        logo: entry.product.logo,
                        tagline: entry.product.tagline,
                        scoreCount:
                          typeof entry.score === "number" ? entry.score : undefined,
                        analytics: {
                          upvotes:
                            entry.upvotes ??
                            entry.product.analytics?.upvotes ??
                            0,
                        },
                        category: entry.product.category ?? undefined,
                        latestRevenueCents: revenue.latestRevenueCents,
                        revenueCurrencyCode: revenue.revenueCurrencyCode,
                        metaLabel: `#${entry.rank}`,
                      }
                    })}
                    columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                    className="gap-y-6"
                    pageSize={9}
                    metaConfig={{
                      type: "badge",
                      badgeVariant: "secondary",
                      badgeClassName: "px-2 py-0.5 text-xs",
                    }}
                  />
                </div>
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <section className="relative py-24">
          <div className="mx-auto max-w-2xl px-4 text-center">
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <IconAnchor className="h-10 w-10 text-[color:var(--brand-1)]" />
              <div className="space-y-2">
                <p className="text-lg font-semibold text-foreground">
                  No rankings recorded yet.
                </p>
                <p className="text-sm text-muted-foreground">
                  As soon as makers start earning placements this period, their
                  victories will appear here.
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href={BROWSE_PATH}>Discover products</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      <section className="relative py-16">
        <div className="mx-auto max-w-[84rem] px-4 md:px-8">
          <div className="grid gap-6 rounded-3xl border border-[color:var(--brand-1)/0.15] bg-background/85 px-8 py-10 shadow-[0px_30px_80px_-55px_rgba(7,58,104,0.65)] backdrop-blur sm:grid-cols-3">
            {MONTHLY_PILLARS.map(({ icon: Icon, title, description }) => (
              <div key={title} className="space-y-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[color:var(--brand-1)/0.2] bg-[color:var(--brand-1)/0.1] text-[color:var(--brand-1)]">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="text-lg font-semibold text-foreground">
                  {title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-20">
        <div className="mx-auto max-w-[84rem] px-4 md:px-8">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 rounded-3xl border border-[color:var(--brand-1)/0.18] bg-background/82 px-8 py-12 text-center shadow-[0px_32px_90px_-60px_rgba(7,58,104,0.55)] backdrop-blur">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Ready to capture next month&apos;s crown?
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
        </div>
      </section>
    </main>
  )
}
