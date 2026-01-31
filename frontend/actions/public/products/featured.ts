"use server"

import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { fastapiFetch, type FastApiError } from "@/lib/fastapi-fetcher"
import type {
  CategorySummary,
  PublicProductCard,
  SponsoredPlacement,
  StickyBannerProduct,
} from "@/lib/generated/fastapi/schemas"

type ApiResponse<T> = {
  data: T
  status: number
  headers: Headers
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

const fetchProductsByBadge = async (
  badge: string,
  limit = 24,
  categorySlug?: string,
  order?: "asc" | "desc",
): Promise<PublicProductCard[]> => {
  const normalized = badge.trim()
  if (!normalized) {
    return []
  }

  try {
    const response = await fastapiFetch<ApiResponse<PublicProductCard[]>>(
      buildPublicUrl(
        `/api/v1/public/products/badges/${encodeURIComponent(normalized)}`,
        { limit, categorySlug, order },
      ),
      { method: "GET" },
    )
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

const fetchTrendingProducts = async (
  limit = 12,
): Promise<PublicProductCard[]> => {
  try {
    const response = await fastapiFetch<ApiResponse<PublicProductCard[]>>(
      buildPublicUrl("/api/v1/public/products/trending", { limit }),
      { method: "GET" },
    )
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

const fetchTopCategories = async (limit = 12): Promise<CategorySummary[]> => {
  try {
    const response = await fastapiFetch<ApiResponse<CategorySummary[]>>(
      buildPublicUrl("/api/v1/public/categories/top", { limit }),
      { method: "GET" },
    )
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

const fetchStickyBannerProducts = async (
  limit = 100,
): Promise<StickyBannerProduct[]> => {
  try {
    const response = await fastapiFetch<ApiResponse<StickyBannerProduct[]>>(
      buildPublicUrl("/api/v1/public/products/sticky-banner", { limit }),
      { method: "GET" },
    )
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

const fetchSponsoredProducts = async (
  limit = 12,
): Promise<SponsoredPlacement[]> => {
  try {
    const response = await fastapiFetch<ApiResponse<SponsoredPlacement[]>>(
      buildPublicUrl("/api/v1/public/products/sponsored", { limit }),
      { method: "GET" },
    )
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

export const getProducts = cached(
  async (badge: string, limit = 24): Promise<PublicProductCard[]> =>
    fetchProductsByBadge(badge, limit),
  "products:by-badge",
  {
    ttl: DEFAULT_TTL.fast,
    tags: ([badge]) => [TAGS.products, TAGS.badges, `badge:${badge}`],
    keyParts: ([badge, limit]) => {
      const parts = [`badge:${badge}`]
      if (typeof limit === "number") {
        parts.push(`limit:${limit}`)
      }
      return parts
    },
  },
)

export const getTrendingProducts = cached(
  async (limit = 12) => fetchTrendingProducts(limit),
  "products:trending",
  {
    ttl: DEFAULT_TTL.fast,
    tags: () => [
      TAGS.products,
      TAGS.trending,
      TAGS.leaderboard,
      TAGS.analytics,
    ],
    keyParts: ([limit]) => [`limit:${limit ?? 12}`],
  },
)

export const getTopCategories = cached(
  async (limit = 12) => fetchTopCategories(limit),
  "categories:top",
  {
    ttl: DEFAULT_TTL.slow,
    tags: () => [TAGS.categories],
    keyParts: ([limit]) => [`limit:${limit ?? 12}`],
  },
)

export const getFeaturedByCategorySlug = cached(
  async (slug: string, limit = 6): Promise<PublicProductCard[]> =>
    fetchProductsByBadge("featured", limit, slug, "desc"),
  "products:featured-by-category",
  {
    ttl: DEFAULT_TTL.fast,
    tags: ([slug]) => [
      TAGS.products,
      TAGS.featured,
      TAGS.badges,
      TAGS.category(String(slug)),
    ],
    keyParts: ([slug, limit]) => [
      `category:${slug}`,
      `limit:${limit ?? 6}`,
    ],
  },
)

export const getStickyBannerProducts = cached(
  async (limit = 100): Promise<StickyBannerProduct[]> =>
    fetchStickyBannerProducts(limit),
  "products:sticky-banner:v2",
  {
    ttl: 600,
    tags: () => [
      TAGS.products,
      TAGS.placement("stickyBanner"),
      TAGS.planFeature("stickyBanner"),
      TAGS.plans,
    ],
    keyParts: ([limit]) => [`limit:${limit ?? 100}`],
  },
)

export const getSponsoredProducts = cached(
  async (limit = 12): Promise<SponsoredPlacement[]> =>
    fetchSponsoredProducts(limit),
  "products:sponsored-products",
  {
    ttl: DEFAULT_TTL.fast,
    tags: () => [
      TAGS.products,
      TAGS.placement("sponsoredProducts"),
      TAGS.planFeature("sponsoredProducts"),
      TAGS.plans,
    ],
    keyParts: ([limit]) => [`limit:${limit ?? 12}`],
  },
)
