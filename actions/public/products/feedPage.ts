"use server"

import type { ProductCardBase } from "@/components/molecules/ProductCard"

import { getBrowseProducts } from "@/actions/public/browse/actions"
import { getKeywordTagProducts } from "@/actions/public/tags/actions"
import { getAlternativeProductsPage } from "@/actions/public/alternatives/actions"

export type ProductFeedPageRequest =
  | {
      kind: "browse"
      page: number
      useCase?: string
      category?: string
      verified?: boolean
      sort?: string
      q?: string
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
      const result = await getBrowseProducts({
        page: request.page,
        useCaseSlug: request.useCase,
        categorySlug: request.category,
        verified: request.verified,
        sort: isValidBrowseSort(request.sort) ? request.sort : undefined,
        query: request.q,
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

    default: {
      const exhaustiveCheck: never = request
      return exhaustiveCheck
    }
  }
}
