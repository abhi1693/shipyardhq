"use server"

import type { ProductCardBase } from "@/components/molecules/ProductCard"
import type { HomepageFeedItem } from "@/lib/generated/fastapi/schemas"
import { fastapiFetch, type FastApiError } from "@/lib/fastapi-fetcher"
import {
  VERIFIED_REVENUE_MAX_PAGE_SIZE,
  VERIFIED_REVENUE_PAGE_SIZE,
} from "@/lib/products/verifiedRevenue"

export interface VerifiedRevenuePageResult {
  items: ProductCardBase[]
  page: number
  pageSize: number
  hasMore: boolean
  nextPage: number | null
  total: number
}

type ApiResponse<T> = {
  data: T
  status: number
  headers: Headers
}

type VerifiedRevenueApiResult = {
  items: HomepageFeedItem[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
  nextPage?: number | null
}

const normalizePage = (value: unknown, fallback: number) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.floor(parsed)
}

const normalizePageSize = (value: unknown, fallback: number) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  const clamped = Math.min(Math.floor(parsed), VERIFIED_REVENUE_MAX_PAGE_SIZE)
  return clamped > 0 ? clamped : fallback
}

const isFastApiNotFound = (error: unknown) => {
  const status = (error as FastApiError | undefined)?.status
  return status === 404 || status === 422
}

const buildPublicUrl = (page: number, pageSize: number) => {
  const search = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  })
  return `/api/v1/public/verified-revenue/products?${search.toString()}`
}

const mapFeedItemToProductCardBase = (
  item: HomepageFeedItem,
): ProductCardBase => ({
  id: item.id,
  slug: item.slug,
  name: item.name,
  logo: item.logo ?? "",
  tagline: item.tagline ?? "",
  badges: item.badges ?? [],
  category:
    item.category || item.categorySlug
      ? {
          name: item.category ?? null,
          slug: item.categorySlug ?? null,
        }
      : null,
  sponsored: item.isSponsored,
  isVerified: item.isVerified,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
  latestRevenueCents:
    typeof item.latestRevenueCents === "number" ? item.latestRevenueCents : null,
  revenueCurrencyCode: item.revenueCurrencyCode ?? null,
  scoreCount:
    typeof item.scoreCount === "number" ? item.scoreCount : undefined,
  interest: item.interest ?? null,
})

export async function getVerifiedRevenueProductsPage(
  params: { page?: number; pageSize?: number } = {},
): Promise<VerifiedRevenuePageResult> {
  const safePage = normalizePage(params.page, 1)
  const safePageSize = normalizePageSize(
    params.pageSize,
    VERIFIED_REVENUE_PAGE_SIZE,
  )
  const path = buildPublicUrl(safePage, safePageSize)

  try {
    const response = await fastapiFetch<ApiResponse<VerifiedRevenueApiResult>>(
      path,
      { method: "GET" },
    )
    if (response.status !== 200) {
      return {
        items: [],
        page: safePage,
        pageSize: safePageSize,
        hasMore: false,
        nextPage: null,
        total: 0,
      }
    }
    const payload = response.data
    const items = Array.isArray(payload.items)
      ? payload.items.map(mapFeedItemToProductCardBase)
      : []

    return {
      items,
      page: Number.isFinite(payload.page) ? payload.page : safePage,
      pageSize: Number.isFinite(payload.pageSize)
        ? payload.pageSize
        : safePageSize,
      hasMore: Boolean(payload.hasMore),
      nextPage:
        typeof payload.nextPage === "number" ? payload.nextPage : null,
      total: typeof payload.total === "number" ? payload.total : items.length,
    }
  } catch (error) {
    if (isFastApiNotFound(error)) {
      return {
        items: [],
        page: safePage,
        pageSize: safePageSize,
        hasMore: false,
        nextPage: null,
        total: 0,
      }
    }
    throw error
  }
}
