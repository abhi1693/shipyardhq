import { getPartnerSpotlightProducts } from "@/actions/public/products/featured"
import type { TaxonomySponsorProduct } from "@/components/templates/public/common/TaxonomyDetailPage"
import { stableUnitInterval } from "@/lib/stable-random"

interface GetTaxonomySponsorProductsOptions {
  excludeSlugs?: string[]
  limit?: number
}

export async function getTaxonomySponsorProducts({
  excludeSlugs = [],
  limit = 24,
}: GetTaxonomySponsorProductsOptions = {}): Promise<TaxonomySponsorProduct[]> {
  const excluded = new Set(excludeSlugs.map((slug) => slug.toLowerCase()))
  const products = await getPartnerSpotlightProducts(Math.max(12, limit))
  const sponsors: TaxonomySponsorProduct[] = []
  const seen = new Set<string>()

  for (const product of products) {
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

  return sponsors.sort((a, b) => {
    const aRank = stableUnitInterval(`taxonomy-sponsors:${a.slug}`)
    const bRank = stableUnitInterval(`taxonomy-sponsors:${b.slug}`)
    if (aRank !== bRank) return aRank - bRank
    return a.name.localeCompare(b.name)
  })
}
