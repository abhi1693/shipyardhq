import { getSponsoredProducts } from "@/actions/public/products/featured"
import type { TaxonomySponsorProduct } from "@/components/templates/public/common/TaxonomyDetailPage"

interface GetTaxonomySponsorProductsOptions {
  excludeSlugs?: string[]
  limit?: number
}

export async function getTaxonomySponsorProducts({
  excludeSlugs = [],
  limit = 2,
}: GetTaxonomySponsorProductsOptions = {}): Promise<TaxonomySponsorProduct[]> {
  const excluded = new Set(excludeSlugs.map((slug) => slug.toLowerCase()))
  const placements = await getSponsoredProducts(Math.max(12, limit))
  const sponsors: TaxonomySponsorProduct[] = []
  const seen = new Set<string>()

  for (const placement of placements) {
    const product = placement.product
    if (!product) continue

    const normalizedSlug = product.slug.toLowerCase()
    if (seen.has(normalizedSlug) || excluded.has(normalizedSlug)) continue

    seen.add(normalizedSlug)
    sponsors.push({
      slug: product.slug,
      name: product.name,
      tagline: product.tagline,
      logo: product.logo,
    })

    if (sponsors.length >= limit) break
  }

  return sponsors
}
