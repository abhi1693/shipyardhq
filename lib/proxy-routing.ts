import {
  parseDirectoryPage,
  supportsDirectoryPagination,
} from "@/lib/directory/pagination"
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
  // This endpoint authenticates its own opaque bearer token. Clerk must not
  // attempt to interpret it as a session JWT.
  if (pathname === "/api/products" || pathname === "/api/products/") {
    return false
  }

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

export function hasSeoQueryNoindexParams(
  searchParams: URLSearchParams,
  pathname?: string,
) {
  return SEO_QUERY_NOINDEX_PARAMS.some((key) => {
    if (key === "page" && pathname && supportsDirectoryPagination(pathname)) {
      const values = searchParams.getAll(key)
      return (
        values.length > 0 &&
        parseDirectoryPage(values.length === 1 ? values[0] : values) === null
      )
    }
    return searchParams.getAll(key).some((value) => value.trim().length > 0)
  })
}

// Negotiation is for browser/crawler documents, not Next's action/RSC protocol.
export function isNegotiableDocumentRequest(method: string, headers: Headers) {
  return (
    (method === "GET" || method === "HEAD") &&
    !headers.has("rsc") &&
    !headers.has("next-action")
  )
}
