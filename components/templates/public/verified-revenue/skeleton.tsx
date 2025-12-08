import PublicTwoColumnLayout from "@/components/layout/public/PublicTwoColumnLayout"
import { CardSkeleton } from "@/components/atoms/card.skeleton"
import ProductFeedCardSkeleton from "@/components/molecules/ProductFeedCard.skeleton"
import { SponsoredProductsSkeleton } from "@/components/templates/public/homepage/sponsored-products"

export function VerifiedRevenuePageSkeleton() {
  return (
    <main className="relative isolate bg-[#f5f7fb]">
      <PublicTwoColumnLayout
        className="pb-24 pt-12"
        mainClassName="gap-10"
        sidebarClassName="lg:sticky lg:top-24 gap-6"
        main={
          <>
            <CardSkeleton
              tone="soft"
              radius="lg"
              lines={6}
              className="border border-border/70 bg-white/90"
            />
            <section className="space-y-4 rounded-2xl border border-border/60 bg-white p-5 shadow-sm sm:p-6">
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <ProductFeedCardSkeleton
                    key={`verified-revenue-skel-${index}`}
                  />
                ))}
              </div>
            </section>
          </>
        }
        sidebar={
          <>
            <SponsoredProductsSkeleton />
          </>
        }
      />
    </main>
  )
}
