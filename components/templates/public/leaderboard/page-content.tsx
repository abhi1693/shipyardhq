import { Suspense } from "react"
import Link from "next/link"

import { Button } from "@/components/atoms/button"
import AffiliateLinkCard from "@/components/molecules/AffiliateLinkCard"
import Hero from "@/components/organisms/directory/Hero"
import { DirectoryProductList } from "@/components/organisms/directory/DirectoryProductList"
import { IconAnchor } from "@tabler/icons-react"
import {
  SponsoredProductsSection,
  SponsoredProductsSkeleton,
} from "@/components/templates/public/homepage/sponsored-products"
import {
  TrafficSidebarStats,
  TrafficSidebarStatsSkeleton,
} from "@/components/templates/public/common/TrafficSidebarStats"
import type { ProductCardBase } from "@/components/molecules/ProductCard"
import {
  BROWSE_PATH,
  LEADERBOARD_GUIDE_PATH,
  MEMBER_PRODUCTS_PATH,
} from "@/lib/routes"
import { getLeaderboardPagePayload } from "@/lib/leaderboard/cache"
import { mapProductCardRecordToBase } from "@/lib/products/selects"
import { CardSkeleton } from "@/components/atoms/card.skeleton"
import HeroSkeleton from "@/components/organisms/directory/Hero.skeleton"
import DirectoryProductListSkeleton from "@/components/organisms/directory/DirectoryProductList.skeleton"
import PublicTwoColumnLayout from "@/components/layout/public/PublicTwoColumnLayout"
import { getProductInterestSignalsMap } from "@/lib/server/analytics/productInterest"

type LeaderboardListItem = ProductCardBase & {
  badges?: string[]
  metaLabel?: string
}

export async function LeaderboardPageContent({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; limit?: string; revenue?: string }>
}) {
  const sp = await searchParams
  const verifiedRevenueOnly = sp?.revenue === "verified"
  const filters = {
    categorySlug: sp?.category,
    limit: Number(sp?.limit ?? 50),
    verifiedRevenueOnly,
  }

  const { stats, products } = await getLeaderboardPagePayload(filters)

  const now = new Date()
  const interestMap = await getProductInterestSignalsMap({
    products: products.map((product) => ({
      id: product.id,
      slug: product.slug,
    })),
  })
  const dailyArchivePath = `/leaderboard/daily/${now.getUTCFullYear()}/${
    now.getUTCMonth() + 1
  }/${now.getUTCDate()}`
  const leaderboardItems: LeaderboardListItem[] = products.map((product) => {
    const base = mapProductCardRecordToBase(product, now)
    const score = (product as any).scoreCount ?? null
    return {
      ...base,
      interest: interestMap.get(base.id) ?? null,
      badges: base.badges ?? undefined,
      voteCount: undefined,
      scoreCount: typeof score === "number" ? score : undefined,
    }
  })

  const totalCount = products.length
  const hasProducts = totalCount > 0

  const toggleHref = (nextValue: "all" | "verified") => {
    const params = new URLSearchParams()
    if (sp?.category) params.set("category", sp.category)
    if (sp?.limit) params.set("limit", sp.limit)
    if (nextValue === "verified") params.set("revenue", "verified")
    const qs = params.toString()
    return qs ? `/leaderboard?${qs}` : "/leaderboard"
  }

  return (
    <main className="relative isolate bg-[#f5f7fb]">
      <PublicTwoColumnLayout
        className="pb-24 pt-12"
        mainClassName="gap-12"
        sidebarClassName="gap-8"
        main={
          <>
            <Hero
              stats={stats}
              title="This month's leaderboard"
              description="Revenue verified products rank higher by default. Products without verified revenue are ranked lower."
              primaryAction={{
                label: "Submit your launch",
                href: MEMBER_PRODUCTS_PATH,
              }}
              secondaryAction={{
                label: "Review the ranking guide",
                href: LEADERBOARD_GUIDE_PATH,
              }}
              tertiaryAction={{
                label: "Launch Archives",
                href: dailyArchivePath,
                variant: "ghost",
              }}
            />

            <section className="flex flex-col gap-8">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={toggleHref("all")}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    !verifiedRevenueOnly
                      ? "border-[color:var(--brand-1)] bg-[color:var(--brand-1)] text-white shadow-[0_12px_32px_-18px_rgba(4,59,89,0.35)]"
                      : "border-border/70 bg-white text-[#1C2333] hover:border-[color:var(--brand-1)]/60 hover:bg-[color:var(--brand-1)/0.06] hover:text-[color:var(--brand-1)]"
                  }`}
                  scroll={false}
                >
                  All products
                </Link>
                <Link
                  href={toggleHref("verified")}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    verifiedRevenueOnly
                      ? "border-[color:var(--brand-1)] bg-[color:var(--brand-1)] text-white shadow-[0_12px_32px_-18px_rgba(4,59,89,0.35)]"
                      : "border-border/70 bg-white text-[#1C2333] hover:border-[color:var(--brand-1)]/60 hover:bg-[color:var(--brand-1)/0.06] hover:text-[color:var(--brand-1)]"
                  }`}
                  scroll={false}
                >
                  Revenue verified only
                </Link>
              </div>

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
            <Suspense fallback={<TrafficSidebarStatsSkeleton />}>
              <TrafficSidebarStats />
            </Suspense>
            <Suspense fallback={<SponsoredProductsSkeleton />}>
              <SponsoredProductsSection />
            </Suspense>
            <AffiliateLinkCard />
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
        sidebarClassName="gap-6"
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
          </>
        }
      />
    </main>
  )
}
