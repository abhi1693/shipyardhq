import { Suspense } from "react"

import { getVerifiedRevenueProductsPage } from "@/actions/public/verified-revenue/actions"
import { getLeaderboardStats } from "@/actions/public/leaderboard/actions"
import PublicTwoColumnLayout from "@/components/layout/public/PublicTwoColumnLayout"
import AffiliateLinkCard from "@/components/molecules/AffiliateLinkCard"
import Hero from "@/components/organisms/directory/Hero"
import {
  SponsoredProductsSection,
  SponsoredProductsSkeleton,
} from "@/components/templates/public/homepage/sponsored-products"
import {
  TrafficSidebarStats,
  TrafficSidebarStatsSkeleton,
} from "@/components/templates/public/common/TrafficSidebarStats"
import { VerifiedRevenueGridClient } from "@/components/templates/public/verified-revenue/VerifiedRevenueGridClient"
import { PAYMENT_PROVIDERS } from "@/lib/paymentProviders"
import { VERIFIED_REVENUE_PAGE_SIZE } from "@/lib/products/verifiedRevenue"

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
        sidebarClassName="gap-8"
        main={
          <>
            <div className="space-y-6">
              <Hero
                stats={stats}
                supportedProviders={PAYMENT_PROVIDERS.map(
                  ({ name, logoSrc }) => ({
                    name,
                    logoSrc,
                  }),
                )}
                title="Revenue verified products"
                description="Revenue verified products rank higher by default. Products without verified revenue are ranked lower."
                primaryAction={null}
                secondaryAction={null}
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
            <div className="hidden lg:block">
              <AffiliateLinkCard />
            </div>
          </>
        }
      />
    </main>
  )
}
