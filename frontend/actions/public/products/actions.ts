import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { fastapiFetch, type FastApiError } from "@/lib/fastapi-fetcher"
import type { PublicProductCard } from "@/lib/generated/fastapi/schemas"
import type { ProductInterestSignals } from "@/types/product-interest"

type ApiResponse<T> = {
  data: T
  status: number
  headers: Headers
}

export type PublicProductUseCase = {
  slug: string
  label: string
}

export type PublicProductCategorySummary = {
  name?: string | null
  slug?: string | null
}

export type PublicProductCategoryDetail = {
  id: string
  name: string
  slug: string
  useCases: PublicProductUseCase[]
}

export type PublicProductUser = {
  id: string
  clerkId?: string | null
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  role?: string | null
}

export type PublicProductMetadata = {
  demoUrl?: string | null
  utmCampaign?: string | null
}

export type PublicProductAnalytics = {
  upvotes?: number | null
}

export type PublicProductVerification = {
  isVerified?: boolean | null
}

export type PublicProductMedia = {
  id: string
  imageUrl: string
  altText?: string | null
}

export type PublicProductAlternative = {
  id: string
  slug: string
  name: string
  websiteUrl: string
  logoUrl?: string | null
}

export type PublicPlanFeatureAssignment = {
  key: string
  enabled: boolean
}

export type PublicProductDetailPayload = {
  id: string
  slug: string
  name: string
  tagline: string
  description: string
  websiteUrl: string
  logo: string
  bannerImage?: string | null
  pricingModel?: string | null
  startingPriceCents?: number | null
  currencyCode?: string | null
  platforms?: string[]
  status: string
  type?: string | null
  publishedAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  keywords?: string[]
  category?: PublicProductCategoryDetail | null
  alternatives?: PublicProductAlternative[]
  user?: PublicProductUser | null
  metadata?: PublicProductMetadata | null
  analytics?: PublicProductAnalytics | null
  verification?: PublicProductVerification | null
  interest?: ProductInterestSignals | null
  media?: PublicProductMedia[]
  badges?: string[]
  planAssignments?: PublicPlanFeatureAssignment[]
  activeFeatureEntitlements?: string[]
  upvotesCount?: number | null
}

export type PublicProductMetaPayload = {
  id: string
  slug: string
  name: string
  tagline: string
  description: string
  websiteUrl: string
  logo: string
  bannerImage?: string | null
  pricingModel?: string | null
  startingPriceCents?: number | null
  currencyCode?: string | null
  platforms?: string[]
  status: string
  type?: string | null
  publishedAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  keywords?: string[]
  category?: PublicProductCategorySummary | null
  user?: PublicProductUser | null
  metadata?: PublicProductMetadata | null
  analytics?: PublicProductAnalytics | null
  verification?: PublicProductVerification | null
  media?: PublicProductMedia[]
  planAssignments?: PublicPlanFeatureAssignment[]
  activeFeatureEntitlements?: string[]
}

export type PublicProductUpvoteState = {
  upvoted: boolean
  upvotes: number
}

export type PublicProductLeaderboardScore = {
  points: number
  rank: number | null
  available: boolean
}

export type ProductRevenuePoint = {
  periodStart: string
  label: string
  allTimeRevenueCents: number
  periodRevenueCents: number
}

export type ProductRevenueSummary = {
  currencyCode: string
  lastSyncedAt?: string | null
  status?: string | null
  provider?: string | null
  latestAllTimeRevenueCents: number
  points: ProductRevenuePoint[]
}

const isFastApiNotFound = (error: unknown) => {
  const status = (error as FastApiError | undefined)?.status
  return status === 404 || status === 422
}

const buildPublicUrl = (
  path: string,
  params?: Record<string, string | number | null | undefined>,
) => {
  if (!params) return path
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || typeof value === "undefined") {
      return
    }
    const normalized = String(value)
    if (!normalized.length) {
      return
    }
    search.set(key, normalized)
  })
  const query = search.toString()
  return query ? `${path}?${query}` : path
}

export const parseProductId = (
  value: string | number | null | undefined,
): number | null => {
  if (value === null || typeof value === "undefined") return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return Math.floor(parsed)
}

const fetchPublicProductDetail = async (
  slug: string,
): Promise<PublicProductDetailPayload | null> => {
  try {
    const response = await fastapiFetch<ApiResponse<PublicProductDetailPayload>>(
      `/api/v1/public/products/${encodeURIComponent(slug)}/detail`,
      { method: "GET" },
    )
    if (response.status !== 200) {
      return null
    }
    return response.data
  } catch (error) {
    if (isFastApiNotFound(error)) {
      return null
    }
    throw error
  }
}

const fetchPublicProductMeta = async (
  slug: string,
): Promise<PublicProductMetaPayload | null> => {
  try {
    const response = await fastapiFetch<ApiResponse<PublicProductMetaPayload>>(
      `/api/v1/public/products/${encodeURIComponent(slug)}/meta`,
      { method: "GET" },
    )
    if (response.status !== 200) {
      return null
    }
    return response.data
  } catch (error) {
    if (isFastApiNotFound(error)) {
      return null
    }
    throw error
  }
}

const fetchPublicProductsByUseCase = async (
  useCaseSlug: string,
  excludeId: string,
  limit: number,
): Promise<PublicProductCard[]> => {
  const path = buildPublicUrl(
    `/api/v1/public/use-cases/${encodeURIComponent(useCaseSlug)}/products`,
    {
      excludeId: excludeId || undefined,
      limit,
    },
  )

  try {
    const response = await fastapiFetch<ApiResponse<PublicProductCard[]>>(path, {
      method: "GET",
    })
    if (response.status !== 200 || !Array.isArray(response.data)) {
      return []
    }
    return response.data
  } catch (error) {
    if (isFastApiNotFound(error)) {
      return []
    }
    throw error
  }
}

const fetchPublicProductRevenue = async (
  productId: string,
): Promise<ProductRevenueSummary | null> => {
  const productPk = parseProductId(productId)
  if (!productPk) return null

  try {
    const response = await fastapiFetch<ApiResponse<ProductRevenueSummary | null>>(
      `/api/v1/public/products/${productPk}/revenue`,
      { method: "GET" },
    )
    if (response.status !== 200) {
      return null
    }
    return response.data ?? null
  } catch (error) {
    if (isFastApiNotFound(error)) {
      return null
    }
    throw error
  }
}

const fetchPublicProductLeaderboard = async (
  productId: string,
): Promise<PublicProductLeaderboardScore | null> => {
  const productPk = parseProductId(productId)
  if (!productPk) return null

  try {
    const response = await fastapiFetch<ApiResponse<PublicProductLeaderboardScore>>(
      `/api/v1/public/products/${productPk}/leaderboard`,
      { method: "GET" },
    )
    if (response.status !== 200) {
      return null
    }
    return response.data
  } catch (error) {
    if (isFastApiNotFound(error)) {
      return null
    }
    throw error
  }
}

export const getPublicProductBySlug = cached(
  async (slug: string) => fetchPublicProductDetail(slug),
  "product:public-by-slug",
  {
    ttl: DEFAULT_TTL.medium,
    tags: ([slug]) => [TAGS.products, TAGS.product(String(slug))],
  },
)

export const getPublicProductMetaBySlug = cached(
  async (slug: string) => fetchPublicProductMeta(slug),
  "product:meta-by-slug",
  {
    ttl: DEFAULT_TTL.slow,
    tags: ([slug]) => [TAGS.products, TAGS.product(String(slug))],
  },
)

export const getPublicProductsByUseCase = cached(
  async (
    useCaseSlug: string,
    excludeId: string,
    limit = 6,
  ): Promise<PublicProductCard[]> => {
    const effectiveLimit = Math.max(1, Math.min(limit, 12))
    return fetchPublicProductsByUseCase(useCaseSlug, excludeId, effectiveLimit)
  },
  "products:public-by-usecase",
  {
    ttl: DEFAULT_TTL.medium,
    tags: ([useCaseSlug]) => [
      TAGS.products,
      TAGS.usecase(String(useCaseSlug)),
    ],
    keyParts: ([useCaseSlug, excludeId, limit]) => [
      `useCase:${useCaseSlug}`,
      `exclude:${excludeId}`,
      `limit:${limit ?? 6}`,
    ],
  },
)

export const getPublicProductRevenue = cached(
  async (productId: string) => fetchPublicProductRevenue(productId),
  "product:revenue",
  {
    ttl: DEFAULT_TTL.slow,
    tags: ([productId]) => [TAGS.products, TAGS.product(String(productId))],
  },
)

export const getPublicProductLeaderboard = cached(
  async (productId: string) => fetchPublicProductLeaderboard(productId),
  "product:leaderboard",
  {
    ttl: DEFAULT_TTL.medium,
    tags: ([productId]) => [
      TAGS.products,
      TAGS.product(String(productId)),
      TAGS.leaderboard,
    ],
  },
)

export async function getPublicProductUpvoteStatus(
  productId: string,
  authToken?: string | null,
): Promise<PublicProductUpvoteState | null> {
  const productPk = parseProductId(productId)
  if (!productPk) return null

  try {
    const response = await fastapiFetch<ApiResponse<PublicProductUpvoteState>>(
      `/api/v1/public/products/${productPk}/upvote-status`,
      {
        method: "GET",
        headers: authToken
          ? {
              Authorization: `Bearer ${authToken}`,
            }
          : undefined,
      },
    )
    if (response.status !== 200) {
      return null
    }
    return response.data
  } catch (error) {
    if (isFastApiNotFound(error)) {
      return null
    }
    throw error
  }
}
