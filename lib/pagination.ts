export type SearchParamValue = string | string[] | undefined

export interface PaginationSearchParams {
  page?: SearchParamValue
  limit?: SearchParamValue
  [key: string]: SearchParamValue
}

export interface PaginationOptions {
  defaultPage?: number
  defaultPageSize?: number
  maxPageSize?: number
}

export interface PaginationResult {
  page: number
  pageSize: number
  skip: number
  take: number
}

function pickValue(value: SearchParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function coerceInteger(
  value: SearchParamValue,
  fallback: number,
  bounds: { min?: number; max?: number } = {},
): number {
  const raw = pickValue(value)
  const parsed = raw !== undefined ? Number(raw) : NaN

  if (!Number.isFinite(parsed)) {
    return fallback
  }

  let next = Math.trunc(parsed)

  if (typeof bounds.min === "number" && next < bounds.min) {
    next = bounds.min
  }

  if (typeof bounds.max === "number" && next > bounds.max) {
    next = bounds.max
  }

  return next
}

export function resolvePagination(
  searchParams: PaginationSearchParams | undefined,
  options: PaginationOptions = {},
): PaginationResult {
  const defaultPage = options.defaultPage ?? 1
  const defaultPageSize = options.defaultPageSize ?? 10
  const maxPageSize = options.maxPageSize ?? 100

  const page = coerceInteger(searchParams?.page, defaultPage, { min: 1 })
  const pageSize = coerceInteger(searchParams?.limit, defaultPageSize, {
    min: 1,
    max: maxPageSize,
  })
  const skip = (page - 1) * pageSize

  return {
    page,
    pageSize,
    skip,
    take: pageSize,
  }
}
