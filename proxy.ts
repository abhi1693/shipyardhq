import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { MEMBER_BASE_PATH } from "@/lib/routes"
const isMemberRoute = createRouteMatcher([`${MEMBER_BASE_PATH}(.*)`])

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
