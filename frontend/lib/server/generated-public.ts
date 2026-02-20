import {
  getProductDetailApiV1PublicProductsSlugDetailGet,
  getProductLeaderboardScoreApiV1PublicProductsProductIdLeaderboardGet,
  getProductMetaApiV1PublicProductsSlugMetaGet,
  getProductRevenueApiV1PublicProductsProductIdRevenueGet,
  getProductUpvoteStatusApiV1PublicProductsProductIdUpvoteStatusGet,
  getProductsByBadgeApiV1PublicProductsBadgesBadgeGet,
  getPublicPlansApiV1PublicPlansGet,
  getPublicUserMetaApiV1PublicUsersUserIdMetaGet,
  getPublicUserProductsApiV1PublicUsersUserIdProductsGet,
  getPublicUsersApiV1PublicUsersGet,
  getUseCaseProductsApiV1PublicUseCasesSlugProductsGet,
  getVerifiedRevenueProductsApiV1PublicVerifiedRevenueProductsGet,
} from "@/lib/generated/fastapi/public-homepage"
import type { FastApiError } from "@/lib/fastapi-fetcher"
import type { ProductCardBase } from "@/components/molecules/ProductCard"
import type {
  HomepageFeedItem,
  PlanType,
  PublicPlan,
  PublicProductCard,
  PublicProductDetailPayload,
  PublicProductLeaderboardScore,
  PublicProductMetaPayload,
  PublicProductUpvoteState,
  PublicUserMeta,
  PublicUsersPageResult,
  ProductRevenuePoint,
  ProductRevenueSummary,
  UserProductsPageResult,
} from "@/lib/generated/fastapi/schemas"

type PublicUsersPageServerResult = Omit<PublicUsersPageResult, "nextPage"> & {
  nextPage: number | null
}

type PublicUserProductsPageServerResult = Omit<UserProductsPageResult, "nextPage"> & {
  nextPage: number | null
}

export interface VerifiedRevenuePageResult {
  items: ProductCardBase[]
  page: number
  pageSize: number
  hasMore: boolean
  nextPage: number | null
  total: number
}

export type ProductRevenueSummaryServer = Omit<ProductRevenueSummary, "points"> & {
  points: ProductRevenuePoint[]
}

const isFastApiNotFound = (error: unknown) => {
  const status = (error as FastApiError | undefined)?.status
  return status === 404 || status === 422
}

const toProductCardBase = (item: HomepageFeedItem): ProductCardBase => ({
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

const computePriceSuffix = (plan: PublicPlan): string | undefined => {
  if (plan.type !== "recurring_price" || !plan.paymentFrequencyInterval) {
    return undefined
  }
  const count = plan.paymentFrequencyCount ?? 1
  const interval = String(plan.paymentFrequencyInterval)
  return `per ${count === 1 ? interval : `${count} ${interval}s`}`
}

export const parseProductId = (
  value: string | number | null | undefined,
): number | null => {
  if (value === null || typeof value === "undefined") return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return Math.floor(parsed)
}

export async function getPublicUsersPageServer(params?: {
  page?: number
  pageSize?: number
}): Promise<PublicUsersPageServerResult> {
  const safePage = Number.isFinite(params?.page) ? Number(params?.page) : 1
  const safePageSize = Number.isFinite(params?.pageSize)
    ? Number(params?.pageSize)
    : 20

  const response = await getPublicUsersApiV1PublicUsersGet({
    page: safePage,
    pageSize: safePageSize,
  })

  if (response.status !== 200) {
    return {
      items: [],
      total: 0,
      page: safePage,
      pageSize: safePageSize,
      hasMore: false,
      nextPage: null,
    }
  }

  return {
    ...response.data,
    nextPage: response.data.nextPage ?? null,
  }
}

export async function getPublicProductBySlugServer(
  slug: string,
): Promise<PublicProductDetailPayload | null> {
  try {
    const response = await getProductDetailApiV1PublicProductsSlugDetailGet(slug)
    if (response.status !== 200) return null
    return response.data
  } catch (error) {
    if (isFastApiNotFound(error)) return null
    throw error
  }
}

export async function getPublicProductMetaBySlugServer(
  slug: string,
): Promise<PublicProductMetaPayload | null> {
  try {
    const response = await getProductMetaApiV1PublicProductsSlugMetaGet(slug)
    if (response.status !== 200) return null
    return response.data
  } catch (error) {
    if (isFastApiNotFound(error)) return null
    throw error
  }
}

export async function getPublicUserProductsPageServer(params: {
  userId: string
  page?: number
  pageSize?: number
}): Promise<PublicUserProductsPageServerResult> {
  const safePage = Number.isFinite(params.page) ? Number(params.page) : 1
  const safePageSize = Number.isFinite(params.pageSize)
    ? Number(params.pageSize)
    : 20

  const response = await getPublicUserProductsApiV1PublicUsersUserIdProductsGet(
    params.userId,
    {
      page: safePage,
      pageSize: safePageSize,
    },
  )

  if (response.status !== 200) {
    return {
      items: [],
      total: 0,
      page: safePage,
      pageSize: safePageSize,
      hasMore: false,
      nextPage: null,
    }
  }

  return {
    ...response.data,
    nextPage: response.data.nextPage ?? null,
  }
}

export async function getVerifiedRevenueProductsPageServer(params?: {
  page?: number
  pageSize?: number
}): Promise<VerifiedRevenuePageResult> {
  const safePage = Number.isFinite(params?.page) ? Number(params?.page) : 1
  const safePageSize = Number.isFinite(params?.pageSize)
    ? Number(params?.pageSize)
    : 20

  const response = await getVerifiedRevenueProductsApiV1PublicVerifiedRevenueProductsGet({
    page: safePage,
    pageSize: safePageSize,
  })

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

  return {
    items: (response.data.items ?? []).map(toProductCardBase),
    page: response.data.page,
    pageSize: response.data.pageSize,
    hasMore: response.data.hasMore,
    nextPage: response.data.nextPage ?? null,
    total: response.data.total,
  }
}

export async function getPublicProductsByUseCaseServer(
  useCaseSlug: string,
  excludeId: string,
  limit = 6,
): Promise<PublicProductCard[]> {
  const effectiveLimit = Math.max(1, Math.min(limit, 12))
  try {
    const response = await getUseCaseProductsApiV1PublicUseCasesSlugProductsGet(
      useCaseSlug,
      {
        excludeId: excludeId || undefined,
        limit: effectiveLimit,
      },
    )
    if (response.status !== 200 || !Array.isArray(response.data)) return []
    return response.data
  } catch (error) {
    if (isFastApiNotFound(error)) return []
    throw error
  }
}

export async function getPublicPlansServer(opts?: { type?: PlanType }) {
  const response = await getPublicPlansApiV1PublicPlansGet(
    opts?.type ? { type: opts.type } : undefined,
  )
  if (response.status !== 200 || !Array.isArray(response.data)) return []
  return response.data.map((plan) => ({
    ...plan,
    priceSuffix: computePriceSuffix(plan),
  }))
}

export async function getProductsByBadgeServer(
  badge: string,
  params?: {
    limit?: number
    categorySlug?: string
    order?: "asc" | "desc"
  },
): Promise<PublicProductCard[]> {
  const response = await getProductsByBadgeApiV1PublicProductsBadgesBadgeGet(
    badge,
    params,
  )
  if (response.status !== 200 || !Array.isArray(response.data)) return []
  return response.data
}

export async function getPublicProductRevenueServer(
  productId: string,
): Promise<ProductRevenueSummaryServer | null> {
  const productPk = parseProductId(productId)
  if (!productPk) return null

  try {
    const response =
      await getProductRevenueApiV1PublicProductsProductIdRevenueGet(
        String(productPk),
      )
    if (response.status !== 200) return null

    const payload = response.data
    if (!payload) return null
    return {
      ...payload,
      points: Array.isArray(payload.points) ? payload.points : [],
    }
  } catch (error) {
    if (isFastApiNotFound(error)) return null
    throw error
  }
}

export async function getPublicProductLeaderboardServer(
  productId: string,
): Promise<PublicProductLeaderboardScore | null> {
  const productPk = parseProductId(productId)
  if (!productPk) return null

  try {
    const response =
      await getProductLeaderboardScoreApiV1PublicProductsProductIdLeaderboardGet(
        String(productPk),
      )
    if (response.status !== 200) return null
    return response.data
  } catch (error) {
    if (isFastApiNotFound(error)) return null
    throw error
  }
}

export async function getPublicProductUpvoteStatusServer(
  productId: string,
  authToken?: string | null,
): Promise<PublicProductUpvoteState | null> {
  const productPk = parseProductId(productId)
  if (!productPk) return null

  try {
    const response =
      await getProductUpvoteStatusApiV1PublicProductsProductIdUpvoteStatusGet(
        String(productPk),
        authToken
          ? {
              headers: {
                Authorization: `Bearer ${authToken}`,
              },
            }
          : undefined,
      )
    if (response.status !== 200) return null
    return response.data
  } catch (error) {
    if (isFastApiNotFound(error)) return null
    throw error
  }
}

export async function getPublicUserMetaServer(
  userId: string,
): Promise<PublicUserMeta | null> {
  const response = await getPublicUserMetaApiV1PublicUsersUserIdMetaGet(userId)
  if (response.status !== 200) return null
  return response.data ?? null
}
