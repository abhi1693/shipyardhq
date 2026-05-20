import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import {
  NextResponse,
  type NextFetchEvent,
  type NextRequest,
} from "next/server"
import { MEMBER_BASE_PATH } from "@/lib/routes"

const isMemberRoute = createRouteMatcher([`${MEMBER_BASE_PATH}(.*)`])
const LEGACY_VERCEL_BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com"
const DEFAULT_MEDIA_BASE_URL = "https://media.shipyardhq.dev"
const PUBLIC_FILE_EXTENSION = /\.[^/]+$/

function redirectLegacyBlobImageRequest(req: NextRequest) {
  const url = new URL(req.url)
  if (url.pathname !== "/_next/image") {
    return null
  }

  const imageUrl = url.searchParams.get("url")
  if (!imageUrl) {
    return null
  }

  let sourceUrl: URL
  try {
    sourceUrl = new URL(imageUrl)
  } catch {
    return null
  }

  if (
    sourceUrl.protocol !== "https:" ||
    !sourceUrl.hostname.endsWith(LEGACY_VERCEL_BLOB_HOST_SUFFIX)
  ) {
    return null
  }

  const mediaBaseUrl = new URL(
    process.env.R2_PUBLIC_BASE_URL || DEFAULT_MEDIA_BASE_URL,
  )
  const nextImageUrl = new URL(url)
  nextImageUrl.searchParams.set(
    "url",
    `${mediaBaseUrl.origin}${sourceUrl.pathname}${sourceUrl.search}`,
  )

  return NextResponse.redirect(nextImageUrl, 308)
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

function isPublicDocumentRequest(req: NextRequest) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return false
  }

  const url = new URL(req.url)
  return (
    url.pathname !== "/_next/image" &&
    url.pathname !== "/markdown-for-agents" &&
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
  // Rewrite sitemap chunk URLs ending with .xml to existing handler
  const url = new URL(req.url)
  const productMatch = url.pathname.match(/^\/sitemap-products\/(\d+)\.xml$/)
  if (productMatch) {
    url.pathname = `/sitemap-products/${productMatch[1]}`
    return NextResponse.rewrite(url)
  }

  const alternativeMatch = url.pathname.match(
    /^\/sitemap-alternatives\/(\d+)\.xml$/,
  )
  if (alternativeMatch) {
    url.pathname = `/sitemap-alternatives/${alternativeMatch[1]}`
    return NextResponse.rewrite(url)
  }

  const tagMatch = url.pathname.match(/^\/sitemap-tags\/(\d+)\.xml$/)
  if (tagMatch) {
    url.pathname = `/sitemap-tags/${tagMatch[1]}`
    return NextResponse.rewrite(url)
  }

  const memberPathRequested = isMemberRoute(req)
  if (memberPathRequested) {
    await auth.protect()
  }

  return NextResponse.next()
})

export default async function proxy(req: NextRequest, event: NextFetchEvent) {
  const legacyBlobImageRedirect = redirectLegacyBlobImageRequest(req)
  if (legacyBlobImageRedirect) {
    return legacyBlobImageRedirect
  }

  const markdownRewrite = rewriteMarkdownRequest(req)
  if (markdownRewrite) {
    return markdownRewrite
  }

  const response = await handleClerkMiddleware(req, event)
  if (!response) {
    return addAgentDiscoveryHeaders(req, NextResponse.next())
  }

  if (response instanceof NextResponse) {
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
