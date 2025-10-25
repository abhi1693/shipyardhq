"use server"

import {
  getAlternativeCatalogPage,
  getAlternativeProductsPage,
} from "./actions"

export async function loadMoreAlternatives(params: {
  page: number
  query?: string
  pageSize?: number
}): Promise<{
  items: import("./actions").AlternativeCatalogItem[]
  hasMore: boolean
  nextPage: number | null
}> {
  const { page, query, pageSize } = params

  const result = await getAlternativeCatalogPage({
    page,
    pageSize,
    query,
  })

  return {
    items: result.items,
    hasMore: result.hasMore,
    nextPage: result.nextPage,
  }
}

export async function loadMoreAlternativeProducts(params: {
  alternativeId: string
  page: number
  pageSize?: number
}): Promise<{
  items: import("./actions").AlternativeDetailProduct[]
  hasMore: boolean
  nextPage: number | null
  total: number
}> {
  const { alternativeId, page, pageSize } = params

  if (!alternativeId) {
    return {
      items: [],
      hasMore: false,
      nextPage: null,
      total: 0,
    }
  }

  const result = await getAlternativeProductsPage({
    alternativeId,
    page,
    pageSize,
  })

  return {
    items: result.items,
    hasMore: result.hasMore,
    nextPage: result.nextPage,
    total: result.total,
  }
}
