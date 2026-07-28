import type { ProductCardBase } from "@/components/molecules/ProductCard"
import { productPath } from "@/lib/routes"
import { toAbsoluteUrlFromSite } from "@/lib/seo/base"

type ProductListProduct = {
  slug: string
  name: string
  logo: string
  tagline?: string | null
  category?: ProductCardBase["category"] | string | null
  pricingModel?: ProductCardBase["pricingModel"] | null
  startingPriceCents?: number | null
  currencyCode?: string | null
}

type BuildProductListItemOptions = {
  product: ProductListProduct
  position: number
  siteUrl: string
  categoryName?: string | null
}

const normalizeSiteUrl = (siteUrl: string) =>
  siteUrl.trim().replace(/\/$/, "") || "https://shipyardhq.dev"

export function buildProductListItem({
  product,
  position,
  siteUrl,
  categoryName,
}: BuildProductListItemOptions) {
  const baseUrl = normalizeSiteUrl(siteUrl)
  const url =
    toAbsoluteUrlFromSite(productPath(product.slug), baseUrl) ??
    `${baseUrl}${productPath(product.slug)}`
  const image = toAbsoluteUrlFromSite(product.logo, baseUrl)
  const productCategory =
    typeof product.category === "string"
      ? product.category
      : (product.category?.name ?? undefined)
  const category = categoryName ?? productCategory
  const item: Record<string, unknown> = {
    "@type": "Thing",
    "@id": `${url}#thing`,
    name: product.name,
    url,
  }

  if (product.tagline) item.description = product.tagline
  if (image) item.image = image
  if (category) item.category = category

  return {
    "@type": "ListItem",
    position,
    url,
    item,
  }
}
