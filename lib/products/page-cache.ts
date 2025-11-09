import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import {
  getPublicProductBySlug,
  getPublicProductsByUseCase,
} from "@/actions/public/products/actions"
import { getPublicProductUpdates } from "@/actions/public/product-updates/actions"
import { getProductReviewSummary } from "@/lib/server/productReviews"
import { productPath } from "@/lib/routes"
import { ensureUrlHasSchema } from "@/lib/utils"
import type { ProductUpdatePublicView } from "@/types/product-updates"

export type PublicProduct = NonNullable<
  Awaited<ReturnType<typeof getPublicProductBySlug>>
>

type UseCaseProduct = Awaited<
  ReturnType<typeof getPublicProductsByUseCase>
>[number]

export type ProductReviewSummary = Awaited<
  ReturnType<typeof getProductReviewSummary>
>

export const APPLICATION_CATEGORY_MAP: Record<string, string> = {
  saas: "BusinessApplication",
  browser_extension: "BrowserApplication",
  mobile_app: "LifestyleApplication",
  desktop_app: "DesktopEnhancementApplication",
  api: "DeveloperApplication",
  open_source: "DeveloperApplication",
  other: "UtilitiesApplication",
}

export function reviewerDisplayName(
  first?: string | null,
  last?: string | null,
) {
  const parts = [first?.trim(), last?.trim()].filter(Boolean)
  return parts.length ? parts.join(" ") : "Shipyard member"
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
  analytics?: { upvotes: number }
  category?: { name: string | null; slug: string | null }
}

export type ProductPagePayload = {
  product: PublicProduct
  reviewSummary: ProductReviewSummary
  productUpdates: ProductUpdatePublicView[]
  hasAdditionalUpdates: boolean
  similarProducts: SimilarProduct[]
  similarUseCase: {
    slug: string
    label: string
  } | null
  structuredData: Record<string, unknown> | null
}

const PRODUCT_UPDATES_PREVIEW = 3
// Fetch one extra update to know if more are available beyond the preview.
const PRODUCT_UPDATES_LIMIT = PRODUCT_UPDATES_PREVIEW + 1

function mapUseCaseProducts(products: UseCaseProduct[]): SimilarProduct[] {
  return products.map((item) => ({
    id: item.id,
    slug: item.slug,
    name: item.name,
    logo: item.logo ?? "",
    tagline: item.tagline ?? "",
    analytics: item.analytics
      ? { upvotes: item.analytics.upvotes ?? 0 }
      : undefined,
    category: item.category ?? undefined,
  }))
}

export function buildProductStructuredData(
  product: PublicProduct,
  reviewSummary: ProductReviewSummary,
) {
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
  const imageUrls = [product.bannerImage, product.logo]
    .map((value) => toAbsoluteUrl(value))
    .filter((value): value is string => Boolean(value))
  const galleryImages =
    product.ProductMedia?.map((item) => toAbsoluteUrl(item.imageUrl)).filter(
      (value): value is string => Boolean(value),
    ) ?? []

  const schemaOperatingSystems = Array.from(
    new Set(
      (product.platforms ?? [])
        .map((platform) => platformSchemaLabel(platform))
        .filter((label): label is string => Boolean(label)),
    ),
  )

  const aggregateRating =
    reviewSummary.totalReviews > 0
      ? {
          "@type": "AggregateRating",
          ratingValue: reviewSummary.averageRating.toFixed(1),
          ratingCount: reviewSummary.totalReviews,
          reviewCount: reviewSummary.totalReviews,
          bestRating: 5,
          worstRating: 0,
        }
      : undefined

  const offers =
    product.startingPriceCents !== null &&
    product.startingPriceCents !== undefined
      ? {
          "@type": "Offer",
          price: (product.startingPriceCents / 100).toFixed(2),
          priceCurrency: product.currencyCode || "USD",
        }
      : undefined

  const structuredData: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: product.name,
    description: product.tagline || product.description || undefined,
    image: imageUrls.length ? imageUrls : undefined,
    screenshot: galleryImages.length ? galleryImages : undefined,
    url: canonicalUrl,
    applicationCategory: APPLICATION_CATEGORY_MAP[product.type] || undefined,
    operatingSystem: schemaOperatingSystems.length
      ? schemaOperatingSystems
      : undefined,
    offers,
  }

  if (aggregateRating) {
    structuredData.aggregateRating = aggregateRating
  }

  const reviews = reviewSummary.reviews.map((review) => ({
    "@type": "Review",
    author: {
      "@type": "Person",
      name: reviewerDisplayName(review.user.firstName, review.user.lastName),
    },
    datePublished: (() => {
      try {
        return new Date(review.createdAt).toISOString()
      } catch {
        return undefined
      }
    })(),
    reviewBody: review.message,
    name: `Feedback for ${product.name}`,
    reviewRating: {
      "@type": "Rating",
      ratingValue: review.rating,
      bestRating: 5,
      worstRating: 0,
    },
  }))
  if (reviews.length) {
    structuredData.review = reviews
  }

  return structuredData
}

export const getProductPagePayload = cached(
  async (slug: string): Promise<ProductPagePayload | null> => {
    const product = await getPublicProductBySlug(slug)
    if (!product) {
      return null
    }

    const useCaseSlug = product.category.useCases?.[0]?.useCase?.slug ?? null

    const [reviewSummary, productUpdatesRaw, similarProductsRaw] =
      await Promise.all([
        getProductReviewSummary(product.id, 12),
        getPublicProductUpdates(product.id, {
          limit: PRODUCT_UPDATES_LIMIT,
        }),
        useCaseSlug
          ? getPublicProductsByUseCase(useCaseSlug, product.id)
          : Promise.resolve([]),
      ])

    const hasAdditionalUpdates =
      productUpdatesRaw.length > PRODUCT_UPDATES_PREVIEW

    const productUpdates = hasAdditionalUpdates
      ? productUpdatesRaw.slice(0, PRODUCT_UPDATES_PREVIEW)
      : productUpdatesRaw

    const similarProducts = mapUseCaseProducts(similarProductsRaw)
    const similarUseCase = product.category.useCases?.[0]?.useCase
      ? {
          slug: product.category.useCases[0].useCase.slug,
          label: product.category.useCases[0].useCase.label,
        }
      : null

    const structuredData = buildProductStructuredData(product, reviewSummary)

    return {
      product,
      reviewSummary,
      productUpdates,
      hasAdditionalUpdates,
      similarProducts,
      similarUseCase,
      structuredData,
    }
  },
  "products:detail:payload",
  {
    ttl: DEFAULT_TTL.medium,
    keyParts: ([slug]) => [slug],
    tags: ([slug]) => [
      TAGS.products,
      TAGS.product(String(slug)),
      TAGS.productReviews,
      TAGS.productUpdatesLatest,
    ],
  },
)
