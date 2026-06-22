import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import {
  NextResponse,
  type NextFetchEvent,
  type NextRequest,
} from "next/server"
import { parseManagedMediaImageUrl } from "@/lib/images/managed-media"
import { MEMBER_BASE_PATH } from "@/lib/routes"
import {
  isMemberPath,
  resolveSitemapChunkRewritePath,
  shouldRunClerkMiddleware,
} from "@/lib/proxy-routing"

const isMemberRoute = createRouteMatcher([`${MEMBER_BASE_PATH}(.*)`])
const PUBLIC_FILE_EXTENSION = /\.[^/]+$/
const PRODUCT_PAGE_PATH_PATTERN = /^\/products\/([^/]+)\/?$/
const PUBLIC_DOCUMENT_CACHE_CONTROL =
  "public, s-maxage=60, stale-while-revalidate=31535940"
const PUBLIC_NOT_FOUND_CACHE_CONTROL =
  "public, s-maxage=60, stale-while-revalidate=300"
const PRIVATE_DOCUMENT_CACHE_CONTROL =
  "private, no-cache, no-store, max-age=0, must-revalidate"

async function redirectMediaImageOptimizationRequest(req: NextRequest) {
  const url = new URL(req.url)
  if (url.pathname !== "/_next/image") {
    return null
  }

  const imageUrl = url.searchParams.get("url")
  const width = Number(url.searchParams.get("w"))
  if (!imageUrl || !Number.isFinite(width) || width <= 0) {
    return null
  }

  if (process.env.NODE_ENV === "development") {
    try {
      const sourceUrl = new URL(imageUrl)
      if (sourceUrl.protocol === "https:" || sourceUrl.protocol === "http:") {
        return NextResponse.redirect(sourceUrl, 307)
      }
    } catch {
      return null
    }
  }

  const sourceUrl = parseManagedMediaImageUrl(imageUrl)
  if (!sourceUrl) {
    return null
  }

  const cacheUrl = new URL("/api/images/cache", req.url)
  cacheUrl.searchParams.set("url", sourceUrl.href)
  cacheUrl.searchParams.set("w", String(width))
  const quality = url.searchParams.get("q")
  if (quality) {
    cacheUrl.searchParams.set("q", quality)
  }

  return NextResponse.rewrite(cacheUrl)
}

function hasExplicitMarkdownAccept(req: NextRequest) {
  const acceptHeader = req.headers.get("accept")
  if (!acceptHeader) {
    return false
  }

  return acceptHeader.split(",").some((entry) => {
    const [mediaType, ...params] = entry
      .split(";")
      .map((part) => part.trim().toLowerCase())
    const qParam = params.find((param) => param.startsWith("q="))
    const q = qParam ? Number(qParam.slice(2)) : 1

    return mediaType === "text/markdown" && Number.isFinite(q) && q > 0
  })
}

function rewriteMarkdownRequest(req: NextRequest) {
  if (
    (req.method !== "GET" && req.method !== "HEAD") ||
    !hasExplicitMarkdownAccept(req)
  ) {
    return null
  }

  const url = new URL(req.url)
  if (
    url.pathname === "/markdown-for-agents" ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith(MEMBER_BASE_PATH) ||
    url.pathname.startsWith("/.well-known/") ||
    PUBLIC_FILE_EXTENSION.test(url.pathname)
  ) {
    return null
  }

  const markdownUrl = new URL(req.url)
  markdownUrl.pathname =
    url.pathname === "/"
      ? "/markdown-for-agents"
      : `/markdown-for-agents${url.pathname}`
  markdownUrl.search = url.search

  return NextResponse.rewrite(markdownUrl)
}

function rewriteSitemapChunkRequest(req: NextRequest) {
  const url = new URL(req.url)
  const rewritePath = resolveSitemapChunkRewritePath(url.pathname)
  if (!rewritePath) {
    return null
  }

  url.pathname = rewritePath
  return NextResponse.rewrite(url)
}

function getProductPageSlug(req: NextRequest) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return null
  }

  if (req.headers.get("rsc")) {
    return null
  }

  const url = new URL(req.url)
  const match = url.pathname.match(PRODUCT_PAGE_PATH_PATTERN)
  if (!match?.[1]) {
    return null
  }

  const accept = req.headers.get("accept")?.toLowerCase() ?? ""
  if (accept && !accept.includes("text/html") && !accept.includes("*/*")) {
    return null
  }

  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

async function rewriteMissingProductRequest(req: NextRequest) {
  const slug = getProductPageSlug(req)
  if (!slug) {
    return null
  }

  const markdownUrl = new URL(
    `/markdown-for-agents/products/${encodeURIComponent(slug)}`,
    req.url,
  )

  let markdownResponse: Response
  try {
    markdownResponse = await fetch(markdownUrl, {
      method: "HEAD",
      headers: { accept: "*/*" },
    })
  } catch {
    return null
  }

  if (markdownResponse.status !== 404) {
    return null
  }

  const notFoundUrl = new URL("/_not-found", req.url)
  const response = addAgentDiscoveryHeaders(
    req,
    NextResponse.rewrite(notFoundUrl, { status: 404 }),
  )
  response.headers.set("Cache-Control", PUBLIC_NOT_FOUND_CACHE_CONTROL)
  return response
}

function isPublicDocumentRequest(req: NextRequest) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return false
  }

  const url = new URL(req.url)
  return (
    url.pathname !== "/_next/image" &&
    url.pathname !== "/markdown-for-agents" &&
    !shouldRunClerkMiddleware(url.pathname) &&
    !url.pathname.startsWith("/api/") &&
    !url.pathname.startsWith("/admin") &&
    !url.pathname.startsWith(MEMBER_BASE_PATH) &&
    !url.pathname.startsWith("/.well-known/") &&
    !PUBLIC_FILE_EXTENSION.test(url.pathname)
  )
}

function appendHeaderValue(response: NextResponse, key: string, value: string) {
  const existing = response.headers.get(key)
  response.headers.set(key, existing ? `${existing}, ${value}` : value)
}

function appendVary(response: NextResponse, value: string) {
  const existing = response.headers.get("Vary")
  if (!existing) {
    response.headers.set("Vary", value)
    return
  }

  const values = existing.split(",").map((entry) => entry.trim().toLowerCase())
  if (!values.includes(value.toLowerCase()) && !values.includes("*")) {
    response.headers.set("Vary", `${existing}, ${value}`)
  }
}

function addAgentDiscoveryHeaders(req: NextRequest, response: NextResponse) {
  if (!isPublicDocumentRequest(req)) {
    return response
  }

  const url = new URL(req.url)
  const markdownPath = `${url.pathname}${url.search}`
  response.headers.set("Cache-Control", PUBLIC_DOCUMENT_CACHE_CONTROL)
  appendVary(response, "Accept")
  appendHeaderValue(
    response,
    "Link",
    [
      '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"; profile="https://www.rfc-editor.org/info/rfc9727"',
      '</llms.txt>; rel="service-doc"; type="text/plain"',
      `<${markdownPath}>; rel="alternate"; type="text/markdown"`,
    ].join(", "),
  )

  return response
}

const handleClerkMiddleware = clerkMiddleware(async (auth, req) => {
  const memberPathRequested = isMemberRoute(req)
  if (memberPathRequested) {
    await auth.protect()
  }

  return NextResponse.next()
})

export default async function proxy(req: NextRequest, event: NextFetchEvent) {
  const mediaImageRedirect = await redirectMediaImageOptimizationRequest(req)
  if (mediaImageRedirect) {
    return mediaImageRedirect
  }

  const markdownRewrite = rewriteMarkdownRequest(req)
  if (markdownRewrite) {
    return markdownRewrite
  }

  const sitemapRewrite = rewriteSitemapChunkRequest(req)
  if (sitemapRewrite) {
    return sitemapRewrite
  }

  const missingProductRewrite = await rewriteMissingProductRequest(req)
  if (missingProductRewrite) {
    return missingProductRewrite
  }

  const url = new URL(req.url)
  if (!shouldRunClerkMiddleware(url.pathname)) {
    return addAgentDiscoveryHeaders(req, NextResponse.next())
  }

  const response = await handleClerkMiddleware(req, event)
  if (!response) {
    return addAgentDiscoveryHeaders(req, NextResponse.next())
  }

  if (response instanceof NextResponse) {
    if (isMemberPath(url.pathname)) {
      response.headers.set("Cache-Control", PRIVATE_DOCUMENT_CACHE_CONTROL)
    }

    return addAgentDiscoveryHeaders(req, response)
  }

  return response
}

export const config = {
  matcher: [
    "/_next/image",
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
}
