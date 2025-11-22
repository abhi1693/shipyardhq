"use server"

import prisma from "@/lib/prisma"
import type { ProductCardBase } from "@/components/molecules/ProductCard"
import {
  VERIFIED_REVENUE_MAX_PAGE_SIZE,
  VERIFIED_REVENUE_ORDER_BY,
  VERIFIED_REVENUE_PAGE_SIZE,
  buildVerifiedRevenueWhere,
} from "@/lib/products/verifiedRevenue"
import {
  mapProductCardRecordToBase,
  productCardSelect,
  type ProductCardRecord,
} from "@/lib/products/selects"

export interface VerifiedRevenuePageResult {
  items: ProductCardBase[]
  page: number
  pageSize: number
  hasMore: boolean
  nextPage: number | null
  total: number
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

export async function getVerifiedRevenueProductsPage(
  params: { page?: number; pageSize?: number } = {},
): Promise<VerifiedRevenuePageResult> {
  const safePage = normalizePage(params.page, 1)
  const safePageSize = normalizePageSize(
    params.pageSize,
    VERIFIED_REVENUE_PAGE_SIZE,
  )
  const skip = (safePage - 1) * safePageSize

  const where = {
    AND: [{ status: "published" as const }, buildVerifiedRevenueWhere()],
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: VERIFIED_REVENUE_ORDER_BY,
      skip,
      take: safePageSize,
      select: productCardSelect,
    }),
    prisma.product.count({ where }),
  ])

  const now = new Date()
  const mappedProducts: ProductCardBase[] = (
    products as ProductCardRecord[]
  ).map((product) => mapProductCardRecordToBase(product, now))
  const hasMore = skip + mappedProducts.length < total

  return {
    items: mappedProducts,
    page: safePage,
    pageSize: safePageSize,
    hasMore,
    nextPage: hasMore ? safePage + 1 : null,
    total,
  }
}
