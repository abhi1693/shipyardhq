import CTAFeatureYourProductCard from "@/components/molecules/CTAFeatureYourProductCard"
import { FeaturedProduct } from "@/types"
import { PageSectionHeader } from "@/components/molecules/PageSectionHeader"
import PublicContainer from "@/components/layout/PublicContainer"
import FeaturedProductGrid from "@/components/molecules/FeaturedProductGrid"

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
      className="relative overflow-hidden border-b bg-background/85 backdrop-blur"
      innerClassName="relative"
      fillScreen={false}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-[color:var(--brand-1)/0.35] to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 right-1/4 -z-20 h-72 w-[70%] rounded-full bg-[radial-gradient(circle,var(--brand-3)/0.2,transparent_70%)] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-30 opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(11, 53, 94, 0.05) 1px, transparent 1px), linear-gradient(180deg, rgba(11, 53, 94, 0.05) 1px, transparent 1px)",
          backgroundSize: "120px 120px",
        }}
      />

      <div className="relative space-y-10">
        <PageSectionHeader
          title="Featured Highlights"
          subtitle="Curated products making waves right now."
          action={
            <a
              href="/browse"
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
