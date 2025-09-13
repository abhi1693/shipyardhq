import PublicContainer from "@/components/layout/PublicContainer"
import { PageSectionHeader } from "@/components/molecules/PageSectionHeader"
import ProductList from "@/components/molecules/ProductList"

type ProductItem = {
  id: string
  slug: string
  name: string
  logo: string
  tagline: string
  ProductBadge?: { badge: string; expiresAt?: Date | string | null }[]
  analytics?: { upvotes?: number | null } | null
  user?: { firstName?: string | null; lastName?: string | null } | null
  category?: { name?: string | null } | null
}

export default function HomepageSpotlight({
  products,
}: {
  products: ProductItem[]
}) {
  if (!products || products.length === 0) return null
  return (
    <PublicContainer
      as="section"
      max="marketing"
      paddingY="py-12"
      className="border-b"
      innerClassName="space-y-8"
      fillScreen={false}
    >
      <PageSectionHeader
        title="Homepage Picks"
        subtitle="Products currently highlighted on our homepage"
      />
      <ProductList
        items={products.map((p) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          logo: p.logo,
          tagline: p.tagline,
          analytics: p.analytics ?? null,
          user: p.user ?? undefined,
          category: p.category ?? undefined,
          badges: (p.ProductBadge || [])
            .filter((b) => !b.expiresAt || new Date(b.expiresAt) > new Date())
            .map((b) => b.badge),
        }))}
        compact={false}
        showCategory
        columns="grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3"
      />
    </PublicContainer>
  )
}
