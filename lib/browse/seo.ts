import type { Metadata } from "next"

export type BrowseSearchParamValue = string | string[] | undefined

export const FILTERED_BROWSE_ROBOTS: Metadata["robots"] = {
  index: false,
  follow: true,
  googleBot: {
    index: false,
    follow: true,
  },
}

export function hasBrowseSearchParams(params: object) {
  return Object.values(params as Record<string, BrowseSearchParamValue>).some(
    (value) =>
      Array.isArray(value)
        ? value.some((item) => item.trim().length > 0)
        : Boolean(value?.trim()),
  )
}

function resolveSingleParam(value: BrowseSearchParamValue) {
  const item = Array.isArray(value) ? value[0] : value
  const trimmed = item?.trim()
  return trimmed?.length ? trimmed : undefined
}

function isIgnoredUseCaseCanonicalParam(
  key: string,
  value: BrowseSearchParamValue,
) {
  const single = resolveSingleParam(value)
  if (!single) return true

  return (
    (key === "page" && single === "1") || (key === "sort" && single === "new")
  )
}

export function isPlainUseCaseBrowseState(params: object) {
  const entries = Object.entries(
    params as Record<string, BrowseSearchParamValue>,
  )
  const useCase = resolveSingleParam(
    (params as Record<string, BrowseSearchParamValue>).useCase,
  )

  if (!useCase || useCase === "__all__") return false

  return entries.every(
    ([key, value]) =>
      key === "useCase" || isIgnoredUseCaseCanonicalParam(key, value),
  )
}
