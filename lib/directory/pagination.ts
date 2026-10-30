export type DirectorySearchParams = Record<
  string,
  string | string[] | undefined
>

// Strict parsing avoids silently rendering page one for broken or duplicate URLs.
export function parseDirectoryPage(value: string | string[] | undefined) {
  if (value === undefined) return 1
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null
  const page = Number(value)
  return Number.isSafeInteger(page) && page <= 100000 ? page : null
}

export function directoryPagePath(
  path: string,
  page: number,
  params: DirectorySearchParams = {},
) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (key === "page" || value === undefined) continue
    for (const item of Array.isArray(value) ? value : [value])
      query.append(key, item)
  }
  if (page > 1) query.set("page", String(page))
  return query.size ? `${path}?${query}` : path
}

export function hasDirectoryFilters(params: DirectorySearchParams) {
  return Object.entries(params).some(
    ([key, value]) =>
      key !== "page" &&
      (Array.isArray(value) ? value.some(Boolean) : Boolean(value)),
  )
}

export function supportsDirectoryPagination(path: string) {
  return path === "/browse" || /^\/categories\/[^/]+\/?$/.test(path)
}
