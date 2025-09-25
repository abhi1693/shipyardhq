import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { MEMBER_BASE_PATH } from "@/lib/routes"
const isMemberRoute = createRouteMatcher([`${MEMBER_BASE_PATH}(.*)`])

export default clerkMiddleware(async (auth, req) => {
  // Rewrite sitemap chunk URLs ending with .xml to existing handler
  const url = new URL(req.url)
  const match = url.pathname.match(/^\/sitemap-products\/(\d+)\.xml$/)
  if (match) {
    url.pathname = `/sitemap-products/${match[1]}`
    return NextResponse.rewrite(url)
  }

  if (isMemberRoute(req)) {
    await auth.protect()
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
