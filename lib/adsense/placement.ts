const ADSENSE_PUBLISHER_CONTENT_PATHS = new Set([
  "/guides/product-launch-checklist",
  "/guides/startup-backlinks-domain-rating",
  "/guides/submit-product-to-directories",
])

export function isAdsensePublisherContentPath(pathname?: string | null) {
  if (!pathname) return false
  const normalized =
    pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname
  return ADSENSE_PUBLISHER_CONTENT_PATHS.has(normalized)
}
