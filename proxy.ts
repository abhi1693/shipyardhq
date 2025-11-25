import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { ADMIN_BASE_PATH, MEMBER_BASE_PATH } from "@/lib/routes"
const isMemberRoute = createRouteMatcher([`${MEMBER_BASE_PATH}(.*)`])

const DISALLOWED_PREFIXES = [
  ADMIN_BASE_PATH,
  MEMBER_BASE_PATH,
  "/api",
  "/auth",
  "/embed",
]
const PAGEVIEW_ENDPOINT = "/api/analytics/pageview"

export default clerkMiddleware(async (auth, req) => {
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

  if (isMemberRoute(req)) {
    await auth.protect()
  }

  // Increment public page views server-side (no client beacons). Skip admin/member/api/auth/embed and assets.
  const cronSecret = process.env.CRON_SECRET?.trim()
  const isPublicRoute =
    Boolean(cronSecret) &&
    !url.pathname.startsWith(PAGEVIEW_ENDPOINT) &&
    !DISALLOWED_PREFIXES.some((prefix) => url.pathname.startsWith(prefix)) &&
    !url.pathname.includes(".")

  if (isPublicRoute && cronSecret) {
    fetch(`${url.origin}${PAGEVIEW_ENDPOINT}`, {
      method: "POST",
      headers: { authorization: `Bearer ${cronSecret}` },
      body: "{}",
      cache: "no-store",
    }).catch(() => null)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
}
