"use server"

import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { fastapiFetch, type FastApiError } from "@/lib/fastapi-fetcher"
import type { HomepageFeedItem } from "@/lib/generated/fastapi/schemas"

const USER_PRODUCTS_PAGE_SIZE = 20
const USER_PRODUCTS_MAX_PAGE_SIZE = 50
const USERS_PAGE_SIZE = 20

type ApiResponse<T> = {
  data: T
  status: number
  headers: Headers
}

export type PublicUserListItem = {
  id: string
  firstName: string | null
  lastName: string | null
  clerkId: string | null
  productCount: number
  avatarUrl: string | null
  latestRevenueCents: number | null
  revenueCurrencyCode: string | null
}

type PublicUserSummary = PublicUserListItem

export type PublicUsersPageResult = {
  items: PublicUserListItem[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
  nextPage: number | null
}

type PublicUsersPageApiResult = PublicUsersPageResult

export type PublicUserMeta = {
  firstName: string | null
  lastName: string | null
}

export type UserProductsPageResult = {
  items: HomepageFeedItem[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
  nextPage: number | null
}

const normalizePage = (value: unknown, fallback: number) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.floor(parsed)
}

const normalizePageSize = (value: unknown, fallback: number) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  const clamped = Math.min(Math.floor(parsed), USER_PRODUCTS_MAX_PAGE_SIZE)
  return Math.max(1, clamped)
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

const fetchUserProductsPage = async (
  userId: string,
  page: number,
  pageSize: number,
): Promise<UserProductsPageResult> => {
  try {
    const response = await fastapiFetch<ApiResponse<UserProductsPageResult>>(
      buildPublicUrl(
        `/api/v1/public/users/${encodeURIComponent(userId)}/products`,
        {
          page,
          pageSize,
        },
      ),
      { method: "GET" },
    )
    if (response.status !== 200 || !response.data) {
      return {
        items: [],
        total: 0,
        page,
        pageSize,
        hasMore: false,
        nextPage: null,
      }
    }
    return response.data
  } catch (error) {
    if (isFastApiNotFound(error)) {
      return {
        items: [],
        total: 0,
        page,
        pageSize,
        hasMore: false,
        nextPage: null,
      }
    }
    throw error
  }
}

const getUserProductsWithPaging = cached(
  async (
    userId: string,
    page: number = 1,
    pageSize: number = USER_PRODUCTS_PAGE_SIZE,
  ): Promise<UserProductsPageResult> => {
    const safePage = normalizePage(page, 1)
    const safePageSize = normalizePageSize(pageSize, USER_PRODUCTS_PAGE_SIZE)
    return fetchUserProductsPage(userId, safePage, safePageSize)
  },
  "user:products:page",
  {
    ttl: DEFAULT_TTL.medium,
    keyParts: ([userId, page, pageSize]) => [
      userId,
      `page:${normalizePage(page, 1)}`,
      `pageSize:${normalizePageSize(pageSize, USER_PRODUCTS_PAGE_SIZE)}`,
    ],
    tags: ([userId]) => [TAGS.users, TAGS.products, TAGS.user(userId)],
  },
)

export async function getUserProductsPage(params: {
  userId: string
  page?: number
  pageSize?: number
}): Promise<UserProductsPageResult> {
  const safePage = normalizePage(params.page, 1)
  const safePageSize = normalizePageSize(
    params.pageSize,
    USER_PRODUCTS_PAGE_SIZE,
  )

  return getUserProductsWithPaging(params.userId, safePage, safePageSize)
}

const fetchPublicUsersPage = async (
  page: number,
  pageSize: number,
): Promise<PublicUsersPageResult> => {
  try {
    const response = await fastapiFetch<ApiResponse<PublicUsersPageApiResult>>(
      buildPublicUrl("/api/v1/public/users", {
        page,
        pageSize,
      }),
      { method: "GET" },
    )
    if (response.status !== 200 || !response.data) {
      return {
        items: [],
        total: 0,
        page,
        pageSize,
        hasMore: false,
        nextPage: null,
      }
    }
    return response.data
  } catch (error) {
    if (isFastApiNotFound(error)) {
      return {
        items: [],
        total: 0,
        page,
        pageSize,
        hasMore: false,
        nextPage: null,
      }
    }
    throw error
  }
}

const getPublicUsersPageCached = cached(
  async (
    page: number = 1,
    pageSize: number = USERS_PAGE_SIZE,
  ): Promise<PublicUsersPageResult> => {
    const safePage = normalizePage(page, 1)
    const safePageSize = normalizePageSize(pageSize, USERS_PAGE_SIZE)
    return fetchPublicUsersPage(safePage, safePageSize)
  },
  "users:public:page",
  {
    ttl: DEFAULT_TTL.slow,
    keyParts: ([page, pageSize]) => [
      `page:${normalizePage(page, 1)}`,
      `pageSize:${normalizePageSize(pageSize, USERS_PAGE_SIZE)}`,
    ],
    tags: () => [TAGS.users, TAGS.products],
  },
)

export async function getPublicUsersPage(
  params: {
    page?: number
    pageSize?: number
  } = {},
): Promise<PublicUsersPageResult> {
  const safePage = normalizePage(params.page, 1)
  const safePageSize = normalizePageSize(params.pageSize, USERS_PAGE_SIZE)

  return getPublicUsersPageCached(safePage, safePageSize)
}

export const getPublicUsersWithCounts = cached(
  async (limit = 48) => {
    const result = await getPublicUsersPage({
      page: 1,
      pageSize: limit,
    })
    return result.items
  },
  "users:with-product-counts",
  { ttl: DEFAULT_TTL.slow, tags: () => [TAGS.users, TAGS.products] },
)

export const getPublicUserMeta = cached(
  async (id: string): Promise<PublicUserMeta | null> => {
    try {
      const response = await fastapiFetch<ApiResponse<PublicUserMeta>>(
        `/api/v1/public/users/${encodeURIComponent(id)}/meta`,
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
  },
  "user:public-meta",
  {
    ttl: DEFAULT_TTL.medium,
    tags: ([id]) => [TAGS.users, TAGS.user(String(id))],
  },
)
