export function formatTagLabel(label: string) {
  if (!label) return ""
  return label
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function buildPageHref(basePath: string, page: number) {
  const params = new URLSearchParams()
  if (page > 1) {
    params.set("page", String(page))
  }
  const qs = params.toString()
  return qs ? `${basePath}?${qs}` : basePath
}
