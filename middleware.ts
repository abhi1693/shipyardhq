import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import {
  ADMIN_BASE_PATH,
  MEMBER_BASE_PATH,
  MEMBER_ONBOARDING_PATH,
} from "@/lib/routes"

const isAdminRoute = createRouteMatcher([`${ADMIN_BASE_PATH}(.*)`])
const isMemberRoute = createRouteMatcher([`${MEMBER_BASE_PATH}(.*)`])

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
  const onboardingOverrideCookie =
    req.cookies.get("shipyard_onboarding_override")?.value === "1"
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
    return NextResponse.redirect(new URL(process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL ?? "/", req.url))
  }

  if (isMemberRoute(req)) {
    await auth.protect()

    const isOnboardingPath = pathname.startsWith(MEMBER_ONBOARDING_PATH)

    if (!onboardingComplete && !isOnboardingPath) {
      if (onboardingOverrideCookie) {
        return NextResponse.next()
      }
      const onboardingUrl = new URL(MEMBER_ONBOARDING_PATH, req.url)
      const requestPathWithSearch = `${pathname}${req.nextUrl.search}`

      if (
        requestPathWithSearch &&
        requestPathWithSearch !== MEMBER_ONBOARDING_PATH
      ) {
        onboardingUrl.searchParams.set("redirectTo", requestPathWithSearch)
      }

      return NextResponse.redirect(onboardingUrl)
    }
  }

  const res = NextResponse.next()
  if (onboardingComplete && onboardingOverrideCookie) {
    res.cookies.set({
      name: "shipyard_onboarding_override",
      value: "",
      maxAge: 0,
      path: "/",
    })
  }
  return res
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
}
