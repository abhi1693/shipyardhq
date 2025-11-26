import { Suspense } from "react"

import { getVerifiedRevenueProductsPage } from "@/actions/public/verified-revenue/actions"
import { getLeaderboardStats } from "@/actions/public/leaderboard/actions"
import PublicTwoColumnLayout from "@/components/layout/public/PublicTwoColumnLayout"
import Hero from "@/components/organisms/directory/Hero"
import {
  ProductUpdatesSection,
  ProductUpdatesSkeleton,
} from "@/components/templates/public/homepage/product-updates"
import {
  SponsoredProductsSection,
  SponsoredProductsSkeleton,
} from "@/components/templates/public/homepage/sponsored-products"
import {
  TrafficSidebarStats,
  TrafficSidebarStatsSkeleton,
} from "@/components/templates/public/common/TrafficSidebarStats"
import { VerifiedRevenueGridClient } from "@/components/templates/public/verified-revenue/VerifiedRevenueGridClient"
import { VERIFIED_REVENUE_PAGE_SIZE } from "@/lib/products/verifiedRevenue"

const SUPPORTED_PROVIDERS = [
  { name: "Stripe", logoSrc: "/providers/stripe.jpeg" },
  { name: "Polar", logoSrc: "/providers/polar.png" },
  { name: "Paddle", logoSrc: "/providers/paddle.png" },
  { name: "Dodo", logoSrc: "/providers/dodo.jpeg" },
  { name: "RevenueCat", logoSrc: "/providers/revenuecat.png" },
  { name: "Lemon Squeezy", logoSrc: "/providers/lemon.jpeg" },
  { name: "AbacatePay", logoSrc: "/providers/abacatepay.jpeg" },
] as const

export async function VerifiedRevenuePageContent() {
  const stats = await getLeaderboardStats()
  const { items, hasMore, nextPage, total, pageSize } =
    await getVerifiedRevenueProductsPage()

  const initialPage = nextPage ?? 2

  return (
    <main className="relative isolate bg-[#f5f7fb]">
      <PublicTwoColumnLayout
        className="pb-24 pt-12"
        mainClassName="gap-12"
        sidebarClassName="lg:sticky lg:top-24 gap-8"
        main={
          <>
            <div className="space-y-6">
              <Hero
                stats={stats}
                supportedProviders={[...SUPPORTED_PROVIDERS]}
                title="The verified revenue leaderboard for startups"
                primaryAction={null}
                secondaryAction={null}
                showDomainRatingBadge={false}
              />
            </div>

            <section
              className="space-y-5 rounded-2xl border border-border/60 bg-white p-5 shadow-[0_20px_70px_-60px_rgba(7,68,134,0.35)] sm:p-6"
              aria-labelledby="verified-revenue-feed"
            >
              <VerifiedRevenueGridClient
                initialProducts={items}
                initialHasMore={hasMore}
                initialPage={initialPage}
                total={total}
                pageSize={pageSize ?? VERIFIED_REVENUE_PAGE_SIZE}
              />
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
            <Suspense fallback={<ProductUpdatesSkeleton />}>
              <ProductUpdatesSection />
            </Suspense>
          </>
        }
      />
    </main>
  )
}
