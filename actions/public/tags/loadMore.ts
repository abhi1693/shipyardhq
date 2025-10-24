"use server"

import {
  getKeywordTagProducts,
  TAG_PRODUCTS_PAGE_SIZE,
} from "@/actions/public/tags/actions"

interface LoadMoreTagProductsParams {
  slug: string
  page: number
}

export async function loadMoreTagProducts({
  slug,
  page,
}: LoadMoreTagProductsParams) {
  const result = await getKeywordTagProducts(slug, page)

  if (!result) {
    return {
      items: [],
      hasMore: false,
      total: 0,
      pageSize: TAG_PRODUCTS_PAGE_SIZE,
    }
  }

  return {
    items: result.products,
    hasMore: result.hasMore,
    total: result.total,
    pageSize: TAG_PRODUCTS_PAGE_SIZE,
  }
}
