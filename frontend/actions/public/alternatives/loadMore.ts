"use server"

import {
  getAlternativeCatalogPage,
  type AlternativeCatalogItem,
} from "./actions"

interface LoadMoreAlternativesOptions {
  page?: number
  pageSize?: number
  query?: string
}

export async function loadMoreAlternatives({
  page,
  pageSize,
  query,
}: LoadMoreAlternativesOptions = {}): Promise<{
  items: AlternativeCatalogItem[]
  hasMore: boolean
  nextPage: number | null
}> {
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
