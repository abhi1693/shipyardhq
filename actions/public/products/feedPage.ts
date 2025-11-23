"use server"

import type { ProductCardBase } from "@/components/molecules/ProductCard"

import prisma from "@/lib/prisma"
import { createStaticProductPager } from "@/lib/products/pagination"
import {
  mapProductCardRecordToBase,
  PRIORITY_FEATURE_KEY,
  productCardSelect,
  type ProductCardRecord,
} from "@/lib/products/selects"
import { getBrowseProducts } from "@/actions/public/browse/actions"
import { getKeywordTagProducts } from "@/actions/public/tags/actions"
import { getAlternativeProductsPage } from "@/actions/public/alternatives/actions"
import { getTopRankedProducts } from "@/actions/public/leaderboard/actions"
import { getPlatformMeta } from "@/lib/platforms/config"
import { productTypeValueFromSlug } from "@/lib/product-types/models"
import { pricingModelValueFromSlug } from "@/lib/pricing/models"
import { getCurrentScoreMap } from "@/lib/products/leaderboard-scores"

export type ProductFeedPageRequest =
  | {
      kind: "browse"
      page: number
      useCase?: string
      category?: string
      verified?: boolean
      sort?: string
      q?: string
      platform?: string
      pricingModel?: string
      productType?: string
    }
  | {
      kind: "tag"
      page: number
      slug: string
    }
  | {
      kind: "alternative"
      page: number
      alternativeId: string
      pageSize?: number
    }
  | {
      kind: "leaderboard"
      page: number
      pageSize?: number
      limit?: number
      categorySlug?: string
    }
  | {
      kind: "rewards"
      page: number
      pageSize?: number
    }

export type ProductFeedPageResponse = {
  items: ProductCardBase[]
  hasMore: boolean
  total?: number
}

const isValidBrowseSort = (
  value: string | undefined,
): value is "new" | "trending" | "votes" | "az" =>
  ["new", "trending", "votes", "az"].includes(value as string)

export async function getProductFeedPage(
  request: ProductFeedPageRequest,
): Promise<ProductFeedPageResponse> {
  switch (request.kind) {
    case "browse": {
      const platformEnum = request.platform
        ? getPlatformMeta(request.platform)?.value
        : undefined
      const pricingModelEnum = pricingModelValueFromSlug(request.pricingModel)
      const productTypeEnum = productTypeValueFromSlug(request.productType)
      const result = await getBrowseProducts({
        page: request.page,
        useCaseSlug: request.useCase,
        categorySlug: request.category,
        verified: request.verified,
        sort: isValidBrowseSort(request.sort) ? request.sort : undefined,
        query: request.q,
        platform: platformEnum,
        pricingModel: pricingModelEnum,
        type: productTypeEnum,
      })

      return {
        items: result.products,
        hasMore: result.hasMore,
      }
    }

    case "tag": {
      const result = await getKeywordTagProducts(request.slug, request.page)

      return {
        items: result?.products ?? [],
        hasMore: result?.hasMore ?? false,
        total: result?.total ?? 0,
      }
    }

    case "alternative": {
      const result = await getAlternativeProductsPage({
        alternativeId: request.alternativeId,
        page: request.page,
        pageSize: request.pageSize,
      })

      return {
        items: result.items,
        hasMore: result.hasMore,
        total: result.total,
      }
    }

    case "leaderboard": {
      const page = Math.max(1, request.page)
      const pageSize = Math.max(1, Math.floor(request.pageSize ?? 20))
      const minimumLimit = page * pageSize
      const limit = Math.max(request.limit ?? minimumLimit, minimumLimit)

      const records = await getTopRankedProducts({
        limit,
        categorySlug: request.categorySlug,
      })

      if (!records.length) {
        return { items: [], hasMore: false, total: 0 }
      }

      const now = new Date()
      const scoreMap = await getCurrentScoreMap(records.map((r) => r.id))
      const pager = createStaticProductPager(records, {
        pageSize,
        mapItem: (record) =>
          mapProductCardRecordToBase(record, now, {
            scoreByProductId: scoreMap,
          }),
      })

      const { items, hasMore } = await pager.loadPage(page)

      return {
        items,
        hasMore,
        total: records.length,
      }
    }

    case "rewards": {
      const page = Math.max(1, request.page)
      const pageSize = Math.max(1, Math.floor(request.pageSize ?? 12))
      const skip = (page - 1) * pageSize

      const where = {
        status: "published",
        plan: {
          is: {
            assignments: {
              some: {
                enabled: true,
                feature: { is: { key: PRIORITY_FEATURE_KEY } },
              },
            },
          },
        },
      } as const

      const [records, total] = await Promise.all([
        prisma.product.findMany({
          where,
          orderBy: [{ updatedAt: "desc" }, { analytics: { upvotes: "desc" } }],
          skip,
          take: pageSize,
          select: productCardSelect,
        }),
        prisma.product.count({ where }),
      ])

      const now = new Date()
      const typedRecords = records as unknown as ProductCardRecord[]

      return {
        items: typedRecords.map((record) =>
          mapProductCardRecordToBase(record, now),
        ),
        hasMore: skip + typedRecords.length < total,
        total,
      }
    }

    default: {
      const exhaustiveCheck: never = request
      return exhaustiveCheck
    }
  }
}
