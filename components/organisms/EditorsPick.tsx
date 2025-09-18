import { FeaturedProduct } from "@/types"
import { PageSectionHeader } from "@/components/molecules/PageSectionHeader"
import PublicContainer from "@/components/layout/PublicContainer"
import FeaturedProductGrid from "@/components/molecules/FeaturedProductGrid"

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
      className="relative overflow-hidden border-b bg-background/80 backdrop-blur"
      innerClassName="relative"
      fillScreen={false}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-[color:var(--brand-2)/0.35] to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 left-1/4 -z-20 h-72 w-[70%] rounded-full bg-[radial-gradient(circle,var(--brand-2)/0.18,transparent_70%)] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-30 opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(7, 58, 104, 0.05) 1px, transparent 1px), linear-gradient(180deg, rgba(7, 58, 104, 0.05) 1px, transparent 1px)",
          backgroundSize: "120px 120px",
        }}
      />

      <div className="relative space-y-10">
        <PageSectionHeader
          align="center"
          title="Editor’s Picks"
          subtitle="Curated favorites from our crew."
        />

        <FeaturedProductGrid items={products} />
      </div>
    </PublicContainer>
  )
}

export default EditorsPick
