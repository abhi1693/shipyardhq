import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server"
import { MEMBER_BASE_PATH } from "@/lib/routes"

const isMemberRoute = createRouteMatcher([`${MEMBER_BASE_PATH}(.*)`])
const LEGACY_VERCEL_BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com"
const DEFAULT_MEDIA_BASE_URL = "https://media.shipyardhq.dev"

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

export default function proxy(req: NextRequest, event: NextFetchEvent) {
  const legacyBlobImageRedirect = redirectLegacyBlobImageRequest(req)
  if (legacyBlobImageRedirect) {
    return legacyBlobImageRedirect
  }

  return handleClerkMiddleware(req, event)
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
