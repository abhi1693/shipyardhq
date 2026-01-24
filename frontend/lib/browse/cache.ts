import type { BrowsePagePayload as ApiBrowsePagePayload } from "@/lib/generated/fastapi/schemas"
import { getBrowsePageApiV1PublicBrowseGet } from "@/lib/generated/fastapi/public-homepage"

export const browseSortLabelMap: Record<BrowseSort, string> = {
  new: "Newest",
  trending: "Trending",
  votes: "Most Upvoted",
  az: "A–Z",
}

export type BrowseSort = "new" | "trending" | "votes" | "az"

export type BrowsePageFilters = {
  useCase?: string
  category?: string
  verified: boolean
  sort: BrowseSort
  page: number
  query?: string
}

export type BrowsePagePayload = Omit<ApiBrowsePagePayload, "filters"> & {
  filters: BrowsePageFilters
}

const normalizeFilters = (filters: BrowsePageFilters): BrowsePageFilters => {
  const page =
    Number.isFinite(filters.page) && filters.page > 0 ? filters.page : 1
  const query = filters.query?.trim()
  return {
    useCase: filters.useCase || undefined,
    category: filters.category || undefined,
    verified: Boolean(filters.verified),
    sort: filters.sort,
    page,
    query: query && query.length ? query : undefined,
  }
}

export const getBrowsePagePayload = async (
  input: BrowsePageFilters,
): Promise<BrowsePagePayload> => {
  const filters = normalizeFilters(input)
  const response = await getBrowsePageApiV1PublicBrowseGet({
    useCase: filters.useCase,
    category: filters.category,
    verified: filters.verified,
    sort: filters.sort,
    page: filters.page,
    q: filters.query,
  })

  const payload = response.data
  const normalizedFilters: BrowsePageFilters = {
    useCase: payload.filters.useCase ?? undefined,
    category: payload.filters.category ?? undefined,
    verified: Boolean(payload.filters.verified),
    sort: (payload.filters.sort as BrowseSort) ?? "new",
    page: payload.filters.page ?? filters.page,
    query: payload.filters.query ?? undefined,
  }

  return {
    ...payload,
    filters: normalizedFilters,
  }
}
