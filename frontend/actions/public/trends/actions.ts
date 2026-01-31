"use server"

import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { fastapiFetch, type FastApiError } from "@/lib/fastapi-fetcher"
import type {
  CategorySummary,
  PublicProductCard,
} from "@/lib/generated/fastapi/schemas"

type ApiResponse<T> = {
  data: T
  status: number
  headers: Headers
}

export type CategoryTrendsPayload = {
  category: CategorySummary
  items: PublicProductCard[]
  total: number
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

const fetchCategoryTrends = async (
  slug: string,
  options?: { revenue?: "verified"; limit?: number },
): Promise<CategoryTrendsPayload | null> => {
  const normalized = slug.trim()
  if (!normalized) {
    return null
  }

  try {
    const response = await fastapiFetch<ApiResponse<CategoryTrendsPayload>>(
      buildPublicUrl(
        `/api/v1/public/trends/categories/${encodeURIComponent(normalized)}`,
        {
          revenue: options?.revenue === "verified" ? "verified" : undefined,
          limit: options?.limit,
        },
      ),
      { method: "GET" },
    )
    if (response.status !== 200 || !response.data) {
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

const getCategoryTrendsCached = cached(
  async (
    slug: string,
    options?: { revenue?: "verified"; limit?: number },
  ) => fetchCategoryTrends(slug, options),
  "trends:category",
  {
    ttl: DEFAULT_TTL.fast,
    tags: ([slug]) => [TAGS.categories, TAGS.products, TAGS.category(slug)],
    keyParts: ([slug, options]) => [
      `slug:${slug}`,
      `revenue:${options?.revenue ?? "all"}`,
      `limit:${options?.limit ?? "default"}`,
    ],
  },
)

export async function getCategoryTrends(params: {
  slug: string
  revenue?: "verified"
  limit?: number
}) {
  return getCategoryTrendsCached(params.slug, {
    revenue: params.revenue,
    limit: params.limit,
  })
}
