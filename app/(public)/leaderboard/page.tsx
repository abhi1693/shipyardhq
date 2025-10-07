import Link from "next/link"

import {
  getLeaderboardStats,
  getTopRankedProducts,
} from "@/actions/public/leaderboard/actions"
import { getCategoriesWithCounts } from "@/actions/public/categories/actions"
import { Button } from "@/components/atoms/button"
import DirectoryHeader from "@/components/organisms/directory/DirectoryHeader"
import { DirectorySectionHeader } from "@/components/molecules/directory/SectionHeader"
import { DirectoryProductList } from "@/components/organisms/directory/DirectoryProductList"
import { DirectoryPromoCard } from "@/components/organisms/directory/PromoCard"
import { TopPlacementCard } from "@/components/molecules/LeaderboardTopPlacement"
import { LeaderboardFilters } from "./filters"
import { IconAnchor, IconTargetArrow } from "@tabler/icons-react"
import { buildPageMetadata } from "@/lib/metadata"
import {
  BROWSE_PATH,
  LEADERBOARD_MONTHLY_PATH,
  LEADERBOARD_PATH,
  LEADERBOARD_GUIDE_PATH,
  MEMBER_PRODUCTS_PATH,
  PRICING_PATH,
} from "@/lib/routes"

export const revalidate = 60

export const metadata = buildPageMetadata({
  title: "Shipyard Leaderboard — Track live launch momentum",
  description:
    "Monitor the Shipyard leaderboard to see which launches are earning the strongest community momentum right now.",
})

type CategoryListItem = Awaited<
  ReturnType<typeof getCategoriesWithCounts>
>[number]
type LeaderboardProduct = Awaited<
  ReturnType<typeof getTopRankedProducts>
>[number]

const leaderboardMetrics = [
  {
    key: "totalProducts",
    label: "Launches ranked",
  },
  {
    key: "totalUpvotes",
    label: "Upvotes cast",
  },
  {
    key: "topScore",
    label: "Current high score",
  },
  {
    key: "totalCreators",
    label: "Supporting makers",
  },
] as const

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; limit?: string }>
}) {
  const sp = await searchParams
  const limit = Number(sp?.limit || 50)
  const categorySlug = sp?.category || undefined

  const [stats, categories, products] = await Promise.all([
    getLeaderboardStats(),
    getCategoriesWithCounts(),
    getTopRankedProducts({ limit, categorySlug }),
  ])

  const topThree = products.slice(0, 3)
  const firstPlacement = topThree[0]
  const runnerUps = topThree.slice(1)
  const rest = products.slice(3)
  const categoryName = categorySlug
    ? categories.find((c: CategoryListItem) => c.slug === categorySlug)?.name
    : undefined
  const totalCount = products.length
  const restHasEntries = rest.length > 0
  const rankLabels = ["Flagship", "First Mate", "Deckhand"]

  return (
    <main className="relative isolate bg-white">

      <div className="relative mx-auto w-full max-w-[120rem] px-4 pb-24 pt-12 md:px-8">
        <div className="space-y-12">
          <DirectoryHeader
            stats={stats}
            eyebrow="Shipyard leaderboard"
            title="Live launch leaderboard"
            description="Track the launches earning peak community momentum on Shipyard. These standings power the homepage spotlight, featured lanes, and daily analytics we share with builders."
            primaryAction={{
              label: "Submit your launch",
              href: MEMBER_PRODUCTS_PATH,
            }}
            secondaryAction={{
              label: "Browse the launch directory",
              href: BROWSE_PATH,
              variant: "outline",
            }}
            metrics={leaderboardMetrics}
          />

          <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,1.05fr)]">
            <div className="flex flex-col gap-10">
              {topThree.length > 0 ? (
                <section className="rounded-3xl border border-border/80 bg-background/75 p-6 shadow-sm shadow-black/5 md:p-8">
                  <DirectorySectionHeader
                    kicker="Leaderboard spotlight"
                    title="Today&apos;s front-runners"
                    description="The top three launches right now—ranked by live upvotes and sustained momentum."
                  />

                  <div className="mt-8 flex flex-col gap-6">
                    {firstPlacement ? (
                      <TopPlacementCard
                        key={firstPlacement.id}
                        product={firstPlacement}
                        rank={1}
                        label={rankLabels[0] ?? "Top 1"}
                      />
                    ) : null}

                    {runnerUps.length ? (
                      <div className="grid gap-6 md:grid-cols-2">
                        {runnerUps.map((product: LeaderboardProduct, index: number) => (
                          <TopPlacementCard
                            key={product.id}
                            product={product}
                            rank={index + 2}
                            label={rankLabels[index + 1] ?? `Top ${index + 2}`}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : null}

              <section className="rounded-3xl border border-border/80 bg-background/75 p-6 shadow-sm shadow-black/5 md:p-8">
                <DirectorySectionHeader
                  kicker="Full standings"
                  title="Every product on the board"
                  description={
                    restHasEntries
                      ? `Showing the next ${Math.max(totalCount - topThree.length, 0)} launches holding steady on the leaderboard.`
                      : "No additional contenders yet—check back as new launches climb the ranks."
                  }
                  action={
                    <Button asChild variant="ghost" size="sm" className="hover:bg-muted/70">
                      <Link href={LEADERBOARD_MONTHLY_PATH}>
                        View monthly champions
                      </Link>
                    </Button>
                  }
                />

                {restHasEntries ? (
                  <div className="mt-8 space-y-6">
                    <DirectoryProductList
                      items={rest.map((p: LeaderboardProduct) => {
                        const activeBadges = (p.ProductBadge ?? []).filter(
                          (badge) =>
                            !badge.expiresAt ||
                            new Date(badge.expiresAt).getTime() > Date.now(),
                        )

                        return {
                          id: p.id,
                          slug: p.slug,
                          name: p.name,
                          logo: p.logo,
                          tagline: p.tagline,
                          analytics: p.analytics ?? null,
                          category: p.category ?? undefined,
                          badges: activeBadges.map((badge) => badge.badge),
                        }
                      })}
                      columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                      metaConfig={{
                        type: "rank",
                        start: topThree.length,
                        badgeClassName:
                          "border-[color:var(--brand-1)/0.28] bg-[color:var(--brand-1)/0.12] text-[color:var(--brand-1)]",
                      }}
                      showBadges
                    />
                  </div>
                ) : (
                  <div className="mt-8 flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border/60 px-6 py-12 text-center text-muted-foreground">
                    <IconAnchor className="h-8 w-8 text-[color:var(--brand-1)]" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        No additional contenders yet.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Invite your crew or explore another category to discover more launches.
                      </p>
                    </div>
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="border-border/70 text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground"
                    >
                      <Link href={BROWSE_PATH}>Browse products</Link>
                    </Button>
                  </div>
                )}
              </section>
            </div>

            <aside className="flex flex-col gap-8">
              <section className="rounded-3xl border border-border/70 bg-background/80 p-6 shadow-sm shadow-black/5">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                      Tune the leaderboard
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Filter by category or adjust how many launches you monitor at once.
                    </p>
                  </div>
                  <LeaderboardFilters
                    categories={categories}
                    selected={categorySlug}
                    limit={limit}
                  />
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>
                      Showing top {totalCount} launch{totalCount === 1 ? "" : "es"}
                      {categoryName ? ` in ${categoryName}` : " across all categories"}.
                    </p>
                    {categorySlug || limit !== 50 ? (
                      <Link
                        href={LEADERBOARD_PATH}
                        className="inline-flex items-center gap-1 font-semibold text-[color:var(--brand-1)] hover:underline"
                      >
                        Reset filters
                      </Link>
                    ) : null}
                  </div>
                </div>
              </section>

              <DirectoryPromoCard
                eyebrow="Placement perks"
                title="Secure premium visibility for your launch"
                description="Guarantee homepage and leaderboard exposure by booking featured or sponsored placements with Shipyard."
                cta={{ label: "Explore promotion plans", href: PRICING_PATH }}
                subtleCta={{ label: "Submit your launch", href: MEMBER_PRODUCTS_PATH }}
              />

              <DirectoryPromoCard
                eyebrow="Ranking transparency"
                title="How we surface leaderboard standings"
                description="Understand the score formula, refresh cadence, and tie-break rules that keep the Shipyard leaderboard fair for every maker."
                cta={{
                  label: "Review the ranking guide",
                  href: LEADERBOARD_GUIDE_PATH,
                  variant: "ghost",
                }}
                icon={<IconTargetArrow className="h-4 w-4" />}
                subtleCta={{
                  label: "Browse monthly champions",
                  href: LEADERBOARD_MONTHLY_PATH,
                }}
              />
            </aside>
          </div>
        </div>
      </div>
    </main>
  )
}
