import { MEMBER_BASE_PATH } from "@/lib/routes"

const CLERK_HANDLED_PATH_PREFIXES = [
  "/api",
  "/auth",
  "/login",
  "/register",
  "/sso-callback",
  "/trpc",
] as const

const SEO_QUERY_NOINDEX_PARAMS = ["page", "q", "sort", "verified"] as const

function matchesPathPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export function isMemberPath(pathname: string) {
  return matchesPathPrefix(pathname, MEMBER_BASE_PATH)
}

export function shouldRunClerkMiddleware(pathname: string) {
  return (
    isMemberPath(pathname) ||
    CLERK_HANDLED_PATH_PREFIXES.some((prefix) =>
      matchesPathPrefix(pathname, prefix),
    )
  )
}

export function resolveSitemapChunkRewritePath(pathname: string) {
  const productMatch = pathname.match(/^\/sitemap-products\/(\d+)\.xml$/)
  if (productMatch) {
    return `/sitemap-products/${productMatch[1]}`
  }

  const alternativeMatch = pathname.match(
    /^\/sitemap-alternatives\/(\d+)\.xml$/,
  )
  if (alternativeMatch) {
    return `/sitemap-alternatives/${alternativeMatch[1]}`
  }

  const tagMatch = pathname.match(/^\/sitemap-tags\/(\d+)\.xml$/)
  if (tagMatch) {
    return `/sitemap-tags/${tagMatch[1]}`
  }

  return null
}

export function hasSeoQueryNoindexParams(searchParams: URLSearchParams) {
  return SEO_QUERY_NOINDEX_PARAMS.some((key) =>
    searchParams.getAll(key).some((value) => value.trim().length > 0),
  )
}
