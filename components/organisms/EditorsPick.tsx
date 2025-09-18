import { FeaturedProduct } from "@/types"
import { PageSectionHeader } from "@/components/molecules/PageSectionHeader"
import PublicContainer from "@/components/layout/PublicContainer"
import FeaturedProductGrid from "@/components/molecules/FeaturedProductGrid"
import { getWaveBackground } from "@/lib/nautical"

interface EditorsPickProps {
  products: FeaturedProduct[]
}

export function EditorsPick({ products }: EditorsPickProps) {
  if (!products || products.length === 0) return null

  return (
    <PublicContainer
      as="section"
      max="marketing"
      paddingY="py-20"
      className="relative overflow-hidden border-b bg-background/85 shadow-[0px_40px_110px_-80px_rgba(7,58,104,0.95)] backdrop-blur"
      innerClassName="relative"
      fillScreen={false}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-[color:var(--brand-2)/0.35] to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-30"
        style={{
          backgroundImage:
            "radial-gradient(120%_100%_at_15%_0%, rgba(9, 60, 109, 0.2), transparent 72%), radial-gradient(90%_70%_at_90%_20%, rgba(10, 78, 138, 0.22), transparent 78%)",
          maskImage:
            "radial-gradient(85%_100%_at_50%_5%, rgba(0,0,0,0.95), transparent 75%)",
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
        className="pointer-events-none absolute inset-x-[-30%] bottom-[-55px] -z-40 h-56 rounded-[50%] bg-[radial-gradient(78%_100%_at_50%_0%,var(--brand-2)/0.2,transparent_82%)] blur-3xl"
      />

      <div className="relative space-y-10">
        <PageSectionHeader
          eyebrow="Crew's Choice"
          align="center"
          title="Editor’s Picks"
          subtitle="Curated favorites from our bridge crew."
        />

        <FeaturedProductGrid items={products} />
      </div>
    </PublicContainer>
  )
}

export default EditorsPick
