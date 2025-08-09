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
      paddingY="py-16"
      className="border-b"
      innerClassName="space-y-8"
      fillScreen={false}
    >
      <PageSectionHeader
        title="Editor’s Picks"
        subtitle="Curated favorites from our team."
      />

      <FeaturedProductGrid items={products} />
    </PublicContainer>
  )
}

export default EditorsPick

