import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const isAdminRoute = createRouteMatcher(["/admin(.*)"])
const isMemberRoute = createRouteMatcher(["/member(.*)"])

interface CustomPublicMetadata {
  role?: "admin" | "member"
  onboardingComplete?: boolean
}

export default clerkMiddleware(async (auth, req) => {
  const { sessionClaims } = await auth()

  const metadata = sessionClaims?.publicMetadata as CustomPublicMetadata

  // Admin access control
  if (isAdminRoute(req) && metadata.role !== "admin") {
    return NextResponse.redirect(new URL("/", req.url))
  }

  if(isMemberRoute(req)) {
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
