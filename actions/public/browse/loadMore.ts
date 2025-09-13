"use server"

import { getBrowseProducts } from "./actions"

const isValidSort = (
  value: string | undefined,
): value is "new" | "trending" | "votes" | "az" => {
  return ["new", "trending", "votes", "az"].includes(value as string)
}

export async function loadMoreProducts(params: {
  page: number
  useCase?: string
  category?: string
  verified?: boolean
  sort?: string
  q?: string
}) {
  const { page, useCase, category, verified, sort, q } = params

  return getBrowseProducts({
    page,
    useCaseSlug: useCase,
    categorySlug: category,
    verified,
    sort: isValidSort(sort) ? sort : undefined, // validated sort
    query: q,
  })
}
