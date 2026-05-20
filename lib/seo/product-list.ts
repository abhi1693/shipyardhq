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

const FREE_PRICING_MODELS = new Set(["free", "freemium"])

const normalizeSiteUrl = (siteUrl: string) =>
  siteUrl.trim().replace(/\/$/, "") || "https://shipyardhq.dev"

const normalizeCurrency = (value?: string | null) => {
  const normalized = value?.trim().toUpperCase()
  return normalized && /^[A-Z]{3}$/.test(normalized) ? normalized : "USD"
}

const resolveOfferPrice = (product: ProductListProduct) => {
  const cents = product.startingPriceCents
  if (typeof cents === "number" && Number.isFinite(cents) && cents >= 0) {
    return (cents / 100).toFixed(2)
  }

  return product.pricingModel && FREE_PRICING_MODELS.has(product.pricingModel)
    ? "0"
    : undefined
}

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
  const price = resolveOfferPrice(product)
  const offers = price
    ? {
        "@type": "Offer",
        url,
        price,
        priceCurrency: normalizeCurrency(product.currencyCode),
        availability: "https://schema.org/OnlineOnly",
      }
    : undefined
  const item: Record<string, unknown> = {
    "@type": offers ? "Product" : "Thing",
    "@id": `${url}${offers ? "#product" : "#thing"}`,
    name: product.name,
    url,
  }

  if (product.tagline) item.description = product.tagline
  if (image) item.image = image
  if (category) item.category = category
  if (offers) item.offers = offers

  return {
    "@type": "ListItem",
    position,
    url,
    item,
  }
}
