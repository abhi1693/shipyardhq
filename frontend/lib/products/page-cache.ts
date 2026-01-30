import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import {
  getPublicProductBySlug,
  getPublicProductsByUseCase,
} from "@/actions/public/products/actions"
import { productPath } from "@/lib/routes"
import { ensureUrlHasSchema } from "@/lib/utils"
import type { ProductInterestSignals } from "@/types/product-interest"

export type PublicProduct = NonNullable<
  Awaited<ReturnType<typeof getPublicProductBySlug>>
>

type UseCaseProduct = Awaited<
  ReturnType<typeof getPublicProductsByUseCase>
>[number]

export const APPLICATION_CATEGORY_MAP: Record<string, string> = {
  saas: "BusinessApplication",
  browser_extension: "BrowserApplication",
  mobile_app: "LifestyleApplication",
  desktop_app: "DesktopEnhancementApplication",
  api: "DeveloperApplication",
  open_source: "DeveloperApplication",
  other: "UtilitiesApplication",
}

export function platformSchemaLabel(platform: string): string | null {
  switch (platform) {
    case "web":
      return "Web"
    case "ios":
      return "iOS"
    case "android":
      return "Android"
    case "mac":
      return "macOS"
    case "windows":
      return "Windows"
    case "linux":
      return "Linux"
    case "chrome_extension":
      return "Google Chrome"
    case "firefox_extension":
      return "Mozilla Firefox"
    default:
      return platform.replace(/[-_]+/g, " ").trim() || null
  }
}

type SimilarProduct = {
  id: string
  slug: string
  name: string
  logo: string
  tagline: string
  category?: { name?: string | null; slug?: string | null }
  badges?: string[]
  sponsored?: boolean
  isVerified?: boolean
  scoreCount?: number
  latestRevenueCents?: number | null
  revenueCurrencyCode?: string | null
  interest?: ProductInterestSignals | null
}

export type ProductPagePayload = {
  product: PublicProduct
  similarProducts: SimilarProduct[]
  similarUseCase: {
    slug: string
    label: string
  } | null
  structuredData: Record<string, unknown> | null
}

function mapUseCaseProducts(products: UseCaseProduct[]): SimilarProduct[] {
  return products.map((item) => ({
    id: item.id,
    slug: item.slug,
    name: item.name,
    logo: item.logo ?? "",
    tagline: item.tagline ?? "",
    category: item.category ?? undefined,
    badges: item.badges ?? [],
    sponsored: item.sponsored ?? false,
    isVerified: item.isVerified ?? false,
    scoreCount: item.scoreCount ?? undefined,
    latestRevenueCents: item.latestRevenueCents ?? null,
    revenueCurrencyCode: item.revenueCurrencyCode ?? null,
    interest: item.interest ?? null,
  }))
}

export function buildProductStructuredData(product: PublicProduct) {
  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "https://shipyardhq.dev"
  ).replace(/\/$/, "")
  const canonicalUrl = `${baseUrl}${productPath(product.slug)}`
  const toAbsoluteUrl = (value?: string | null) => {
    if (!value) return null
    const trimmed = value.trim()
    if (!trimmed) return null
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    if (trimmed.startsWith("/")) {
      return `${baseUrl}${trimmed}`
    }
    return ensureUrlHasSchema(trimmed)
  }
  const logoUrl = toAbsoluteUrl(product.logo)
  const bannerUrl = toAbsoluteUrl(product.bannerImage)
  const galleryImages =
    product.media?.map((item) => toAbsoluteUrl(item.imageUrl)).filter(
      (value): value is string => Boolean(value),
    ) ?? []
  const screenshotImages = [bannerUrl, ...galleryImages].filter(
    (value): value is string => Boolean(value),
  )

  const schemaOperatingSystems = Array.from(
    new Set(
      (product.platforms ?? [])
        .map((platform) => platformSchemaLabel(platform))
        .filter((label): label is string => Boolean(label)),
    ),
  )

  const offers = {
    "@type": "Offer",
    price: ((product.startingPriceCents ?? 0) / 100).toFixed(2),
    priceCurrency: product.currencyCode || "USD",
  }

  const structuredData: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: product.name,
    description: product.tagline || product.description || undefined,
    image: logoUrl ? [logoUrl] : undefined,
    screenshot: screenshotImages.length ? screenshotImages : undefined,
    url: canonicalUrl,
    applicationCategory: APPLICATION_CATEGORY_MAP[product.type] || undefined,
    operatingSystem: schemaOperatingSystems.length
      ? schemaOperatingSystems
      : undefined,
    offers,
  }

  return structuredData
}

export const getProductPagePayload = cached(
  async (slug: string): Promise<ProductPagePayload | null> => {
    const product = await getPublicProductBySlug(slug)
    if (!product) {
      return null
    }

    const useCaseSlug = product.category?.useCases?.[0]?.slug ?? null

    const similarProductsRaw = useCaseSlug
      ? await getPublicProductsByUseCase(useCaseSlug, product.id)
      : []

    const similarProducts = mapUseCaseProducts(similarProductsRaw)
    const similarUseCase = product.category?.useCases?.[0]
      ? {
          slug: product.category.useCases[0].slug,
          label: product.category.useCases[0].label,
        }
      : null

    const structuredData = buildProductStructuredData(product)

    return {
      product,
      similarProducts,
      similarUseCase,
      structuredData,
    }
  },
  "products:detail:payload",
  {
    ttl: DEFAULT_TTL.medium,
    keyParts: ([slug]) => [slug],
    tags: ([slug]) => [TAGS.products, TAGS.product(String(slug))],
  },
)
