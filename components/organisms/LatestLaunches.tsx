import { FeaturedProduct } from "@/types"
import { PageSectionHeader } from "@/components/molecules/PageSectionHeader"
import PublicContainer from "@/components/layout/PublicContainer"
import { ProductCompactGrid } from "@/components/molecules/ProductCompactGrid"
import { getWaveBackground } from "@/lib/nautical"

interface LatestLaunchesProps {
  products: FeaturedProduct[]
}

export function LatestLaunches({ products }: LatestLaunchesProps) {
  if (!products || products.length === 0) return null

  return (
    <PublicContainer
      as="section"
      max="marketing"
      paddingY="py-20"
      className="relative overflow-hidden border-b bg-background/85 shadow-[0px_40px_110px_-80px_rgba(7,58,104,0.9)] backdrop-blur"
      innerClassName="relative"
      fillScreen={false}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-[color:var(--brand-3)/0.35] to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-30"
        style={{
          backgroundImage:
            "radial-gradient(110%_85%_at_85%_-10%, rgba(13, 69, 120, 0.24), transparent 76%), radial-gradient(90%_75%_at_10%_20%, rgba(9, 43, 78, 0.22), transparent 72%)",
          maskImage:
            "radial-gradient(80%_100%_at_50%_5%, rgba(0,0,0,0.95), transparent 75%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 opacity-30"
        style={{
          ...getWaveBackground("240px 90px"),
          backgroundPosition: "0 55%",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[-28%] bottom-[-52px] -z-40 h-56 rounded-[50%] bg-[radial-gradient(78%_100%_at_50%_0%,var(--brand-3)/0.22,transparent_82%)] blur-3xl"
      />

      <div className="relative space-y-10">
        <PageSectionHeader
          align="center"
          eyebrow="Fresh Launches"
          title="Fresh Off the Dock"
          subtitle="Explore the latest ships to depart our makers' slips."
        />

        <ProductCompactGrid
          items={products.map(({ product }) => ({
            id: product.id,
            slug: product.slug,
            name: product.name,
            logo: product.logo,
            tagline: product.tagline,
            analytics: product.analytics ?? null,
            category: product.category ?? undefined,
          }))}
        />
      </div>
    </PublicContainer>
  )
}
