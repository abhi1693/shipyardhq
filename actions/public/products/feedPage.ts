"use server"

import type { ProductCardBase } from "@/components/molecules/ProductCard"

import { createStaticProductPager } from "@/lib/products/pagination"
import { mapProductCardRecordToBase } from "@/lib/products/selects"
import { getBrowseProducts } from "@/actions/public/browse/actions"
import { getKeywordTagProducts } from "@/actions/public/tags/actions"
import { getAlternativeProductsPage } from "@/actions/public/alternatives/actions"
import { getTopRankedProducts } from "@/actions/public/leaderboard/actions"
import { getPlatformMeta } from "@/lib/platforms/config"
import { productTypeValueFromSlug } from "@/lib/product-types/models"
import { pricingModelValueFromSlug } from "@/lib/pricing/models"
import { getCurrentScoreMap } from "@/lib/products/leaderboard-scores"
import { getPriorityPlacementPlanIds } from "@/lib/products/priority-plans"
import { getProductInterestSignalsMap } from "@/lib/server/analytics/productInterest"

export type ProductFeedPageRequest =
  | {
      kind: "browse"
      page: number
      useCase?: string
      category?: string
      sort?: string
      q?: string
      platform?: string
      pricingModel?: string
      productType?: string
      verified?: boolean
      minPrice?: number
      maxPrice?: number
      badge?: string
      alternative?: string
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
        minPriceCents:
          typeof request.minPrice === "number"
            ? request.minPrice * 100
            : undefined,
        maxPriceCents:
          typeof request.maxPrice === "number"
            ? request.maxPrice * 100
            : undefined,
        badge: request.badge,
        alternativeSlug: request.alternative,
      })

      const interestMap = await getProductInterestSignalsMap({
        products: result.products.map((product) => ({
          id: product.id,
          slug: product.slug,
        })),
      })

      return {
        items: result.products.map((product) => ({
          ...product,
          interest: interestMap.get(product.id) ?? null,
        })),
        hasMore: result.hasMore,
      }
    }

    case "tag": {
      const result = await getKeywordTagProducts(request.slug, request.page)

      const tagProducts: ProductCardBase[] = result?.products ?? []
      const interestMap = await getProductInterestSignalsMap({
        products: tagProducts.map((product) => ({
          id: product.id,
          slug: product.slug,
        })),
      })

      return {
        items: tagProducts.map((product) => ({
          ...product,
          interest: interestMap.get(product.id) ?? null,
        })),
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

      const interestMap = await getProductInterestSignalsMap({
        products: result.items.map((product) => ({
          id: product.id,
          slug: product.slug,
        })),
      })

      return {
        items: result.items.map((product) => ({
          ...product,
          interest: interestMap.get(product.id) ?? null,
        })),
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
      const [scoreMap, priorityPlanIds] = await Promise.all([
        getCurrentScoreMap(records.map((r) => r.id)),
        getPriorityPlacementPlanIds(),
      ])
      const pager = createStaticProductPager(records, {
        pageSize,
        mapItem: (record) =>
          mapProductCardRecordToBase(record, now, {
            scoreByProductId: scoreMap,
            priorityPlanIds,
          }),
      })

      const { items, hasMore } = await pager.loadPage(page)

      const interestMap = await getProductInterestSignalsMap({
        products: items.map((product) => ({
          id: product.id,
          slug: product.slug,
        })),
      })

      return {
        items: items.map((product) => ({
          ...product,
          interest: interestMap.get(product.id) ?? null,
        })),
        hasMore,
        total: records.length,
      }
    }

    default: {
      const exhaustiveCheck: never = request
      return exhaustiveCheck
    }
  }
}
