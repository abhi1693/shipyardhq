"use server"

import { getAlternativeCatalogPage } from "./actions"

export async function loadMoreAlternatives(params: {
  page: number
  query?: string
  pageSize?: number
}) {
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

