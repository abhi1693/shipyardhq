import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const isAdminRoute = createRouteMatcher(["/admin(.*)"])
const isMemberRoute = createRouteMatcher(["/member(.*)"])

interface CustomPublicMetadata {
  role?: "admin" | "member"
  onboardingComplete?: boolean
  status?: "active" | "suspended" | "terminated"
}

export default clerkMiddleware(async (auth, req) => {
  // Rewrite sitemap chunk URLs ending with .xml to existing handler
  const url = new URL(req.url)
  const match = url.pathname.match(/^\/sitemap-products\/(\d+)\.xml$/)
  if (match) {
    url.pathname = `/sitemap-products/${match[1]}`
    return NextResponse.rewrite(url)
  }

  const { sessionClaims } = await auth()

  const metadata = sessionClaims?.metadata as CustomPublicMetadata
  const status = metadata?.status
  const onboardingComplete = metadata?.onboardingComplete === true
  const pathname = req.nextUrl.pathname
  const isSuspended = status && status !== "active"

  if (isSuspended) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 })
    }

    if (!pathname.startsWith("/auth/suspended")) {
      return NextResponse.redirect(new URL("/auth/suspended", req.url))
    }
  }

  // Admin access control
  if (isAdminRoute(req) && metadata?.role !== "admin") {
    return NextResponse.redirect(new URL("/", req.url))
  }

  if (isMemberRoute(req)) {
    await auth.protect()

    const isOnboardingPath = pathname.startsWith("/member/onboarding")

    if (!onboardingComplete && !isOnboardingPath) {
      const onboardingUrl = new URL("/member/onboarding", req.url)
      const requestPathWithSearch = `${pathname}${req.nextUrl.search}`

      if (
        requestPathWithSearch &&
        requestPathWithSearch !== "/member/onboarding"
      ) {
        onboardingUrl.searchParams.set("redirectTo", requestPathWithSearch)
      }

      return NextResponse.redirect(onboardingUrl)
    }
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
