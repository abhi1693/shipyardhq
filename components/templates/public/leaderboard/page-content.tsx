import { Suspense } from "react"
import Link from "next/link"

import { Button } from "@/components/atoms/button"
import Hero from "@/components/organisms/directory/Hero"
import { DirectoryProductList } from "@/components/organisms/directory/DirectoryProductList"
import { DirectoryPromoCard } from "@/components/organisms/directory/PromoCard"
import { IconAnchor, IconRadar, IconTargetArrow } from "@tabler/icons-react"
import { ProductUpdatesFeed } from "@/components/molecules/ProductUpdatesFeed"
import {
  SponsoredProductsSection,
  SponsoredProductsSkeleton,
} from "@/components/templates/public/homepage/sponsored-products"
import {
  BROWSE_PATH,
  LEADERBOARD_MONTHLY_PATH,
  LEADERBOARD_GUIDE_PATH,
  MEMBER_PRODUCTS_PATH,
  TRENDS_PATH,
} from "@/lib/routes"
import { getLeaderboardPagePayload } from "@/lib/leaderboard/cache"
import { mapProductCardRecordToBase } from "@/lib/products/selects"
import { CardSkeleton } from "@/components/atoms/card.skeleton"
import { ProductUpdatesFeedSkeleton } from "@/components/molecules/ProductUpdatesFeed.skeleton"
import HeroSkeleton from "@/components/organisms/directory/Hero.skeleton"
import DirectoryProductListSkeleton from "@/components/organisms/directory/DirectoryProductList.skeleton"
import PublicTwoColumnLayout from "@/components/layout/public/PublicTwoColumnLayout"

export async function LeaderboardPageContent({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; limit?: string }>
}) {
  const sp = await searchParams
  const filters = {
    categorySlug: sp?.category,
    limit: Number(sp?.limit ?? 50),
  }

  const { stats, products, latestProductUpdates } =
    await getLeaderboardPagePayload(filters)

  const now = new Date()
  const leaderboardItems = products.map((product) =>
    mapProductCardRecordToBase(product, now),
  )

  const totalCount = products.length
  const hasProducts = totalCount > 0

  return (
    <main className="relative isolate bg-[#f5f7fb]">
      <PublicTwoColumnLayout
        className="pb-24 pt-12"
        mainClassName="gap-12"
        sidebarClassName="lg:sticky lg:top-24 gap-8"
        main={
          <>
            <Hero
              stats={stats}
              title="This month's leaderboard"
              description="Watch the Shipyard launches leading the board this month, updated as founders earn fresh momentum from the community."
              primaryAction={{
                label: "Submit your launch",
                href: MEMBER_PRODUCTS_PATH,
              }}
              secondaryAction={{
                label: "View monthly champions",
                href: LEADERBOARD_MONTHLY_PATH,
                variant: "ghost",
              }}
            />

            <section className="flex flex-col gap-8">
              {hasProducts ? (
                <DirectoryProductList
                  items={leaderboardItems}
                  columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                  metaConfig={{
                    type: "rank",
                    badgeClassName:
                      "border-[color:var(--brand-1)/0.28] bg-[color:var(--brand-1)/0.12] text-[color:var(--brand-1)]",
                  }}
                />
              ) : (
                <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border/60 px-6 py-12 text-center text-muted-foreground">
                  <IconAnchor className="h-8 w-8 text-[color:var(--brand-1)]" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      No contenders yet.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Invite your team or explore another category to discover
                      early movers.
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
          </>
        }
        sidebar={
          <>
            <Suspense fallback={<SponsoredProductsSkeleton />}>
              <SponsoredProductsSection />
            </Suspense>

            <DirectoryPromoCard
              title="See the Trend Radar in motion"
              description="Watch Shipyard categories heat up across momentum, catalog depth, and upvote signal—auto-refreshed and ready to embed."
              cta={{
                label: "Open Trend Radar",
                href: TRENDS_PATH,
              }}
              icon={<IconRadar className="h-4 w-4" />}
            />

            <ProductUpdatesFeed updates={latestProductUpdates} />

            <DirectoryPromoCard
              title="How we surface leaderboard standings"
              description="Understand the score formula, refresh cadence, and tie-break rules that keep the Shipyard leaderboard fair for every maker."
              cta={{
                label: "Review the ranking guide",
                href: LEADERBOARD_GUIDE_PATH,
                variant: "ghost",
              }}
              icon={<IconTargetArrow className="h-4 w-4" />}
            />
          </>
        }
      />
    </main>
  )
}

export function LeaderboardPageSkeleton() {
  return (
    <main className="relative isolate bg-[#f5f7fb]">
      <PublicTwoColumnLayout
        className="pb-24 pt-12"
        mainClassName="gap-12"
        sidebarClassName="lg:sticky lg:top-24 gap-6"
        main={
          <>
            <HeroSkeleton metricCount={0} />
            <section className="flex flex-col gap-8">
              <DirectoryProductListSkeleton count={12} showMetaBadge />
            </section>
          </>
        }
        sidebar={
          <>
            <CardSkeleton
              tone="soft"
              radius="lg"
              lines={4}
              className="border border-border/80 bg-white/95"
            />
            <SponsoredProductsSkeleton />
            <ProductUpdatesFeedSkeleton />
          </>
        }
      />
    </main>
  )
}
