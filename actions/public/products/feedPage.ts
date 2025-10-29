"use server"

import type { ProductCardBase } from "@/components/molecules/ProductCard"

import { loadMoreProducts } from "@/actions/public/browse/loadMore"
import { loadMoreTagProducts } from "@/actions/public/tags/loadMore"
import { loadMoreAlternativeProducts } from "@/actions/public/alternatives/loadMore"

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

export async function getProductFeedPage(
  request: ProductFeedPageRequest,
): Promise<ProductFeedPageResponse> {
  switch (request.kind) {
    case "browse": {
      const result = await loadMoreProducts({
        page: request.page,
        useCase: request.useCase,
        category: request.category,
        verified: request.verified,
        sort: request.sort,
        q: request.q,
      })

      return {
        items: result.products,
        hasMore: result.hasMore,
      }
    }

    case "tag": {
      const result = await loadMoreTagProducts({
        slug: request.slug,
        page: request.page,
      })

      return {
        items: result.items,
        hasMore: result.hasMore,
        total: result.total,
      }
    }

    case "alternative": {
      const result = await loadMoreAlternativeProducts({
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
