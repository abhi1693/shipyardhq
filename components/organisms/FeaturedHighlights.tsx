import CTAFeatureYourProductCard from "@/components/molecules/CTAFeatureYourProductCard"
import { FeaturedProduct } from "@/types"
import { PageSectionHeader } from "@/components/molecules/PageSectionHeader"
import PublicContainer from "@/components/layout/PublicContainer"
import FeaturedProductGrid from "@/components/molecules/FeaturedProductGrid"
import { getWaveBackground } from "@/lib/nautical"
import { BROWSE_PATH } from "@/lib/routes"

export function FeaturedHighlights({
  products,
}: {
  products: FeaturedProduct[]
}) {
  return (
    <PublicContainer
      as="section"
      max="marketing"
      paddingY="py-20"
      className="relative overflow-hidden border-b bg-background/88 shadow-[0px_40px_110px_-70px_rgba(7,58,104,0.95)] backdrop-blur"
      innerClassName="relative"
      fillScreen={false}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-[color:var(--brand-1)/0.35] to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-30"
        style={{
          backgroundImage:
            "radial-gradient(110%_90%_at_85%_-10%, rgba(10, 64, 112, 0.26), transparent 75%), radial-gradient(90%_70%_at_10%_20%, rgba(6, 38, 73, 0.22), transparent 72%)",
          maskImage:
            "radial-gradient(78%_100%_at_50%_0%, rgba(0,0,0,0.95), transparent 75%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 opacity-30"
        style={{
          ...getWaveBackground("220px 85px"),
          backgroundPosition: "0 55%",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[-25%] bottom-[-50px] -z-40 h-52 rounded-[50%] bg-[radial-gradient(75%_100%_at_50%_0%,var(--brand-3)/0.2,transparent_80%)] blur-3xl"
      />

      <div className="relative space-y-10">
        <PageSectionHeader
          eyebrow="Featured Fleet"
          title="Highlights From the Helm"
          subtitle="Curated launches making waves across the community."
          action={
            <a
              href={BROWSE_PATH}
              className="hidden items-center rounded-md border border-[color:var(--brand-1)/0.35] px-3 py-1.5 text-sm text-[color:var(--brand-1)] shadow-[0px_15px_35px_-28px_rgba(7,58,104,0.9)] transition-colors hover:bg-[color:var(--brand-1)/0.05] md:inline-flex"
            >
              View all
            </a>
          }
        />

        <FeaturedProductGrid
          items={products}
          filterExpiredBadges={false}
          extra={<CTAFeatureYourProductCard />}
        />
      </div>
    </PublicContainer>
  )
}
