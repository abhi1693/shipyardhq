export function normalizeAnalyticsPath(value?: string | null) {
  if (!value) return "/"
  const base = value.split(/[?#]/)[0] || "/"
  return base !== "/" && base.endsWith("/") ? base.slice(0, -1) : base
}

export function extractProductSlug(value?: string | null) {
  const path = normalizeAnalyticsPath(value)
  const match = path.match(/^\/products\/([^/]+)/)
  return match?.[1]?.toLowerCase() ?? null
}
