import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { MEMBER_BASE_PATH } from "@/lib/routes"

const isMemberRoute = createRouteMatcher([`${MEMBER_BASE_PATH}(.*)`])

export default clerkMiddleware(async (auth, req) => {
  if (process.env.MAINTENANCE_MODE === "true") {
    const maintenanceHtml = `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Shipyard HQ</title><style>body{margin:0;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;}main{max-width:560px;text-align:center;padding:32px;background:rgba(15,23,42,0.75);border:1px solid rgba(226,232,240,0.15);border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.35);}h1{margin-bottom:12px;font-size:28px;}p{margin:0;font-size:16px;line-height:1.6;color:#cbd5e1;}</style></head><body><main><h1>We&rsquo;ll be right back</h1><p>Shipyard HQ is undergoing scheduled maintenance. Thanks for your patience while we get things ready for you.</p></main></body></html>`

    return new NextResponse(maintenanceHtml, {
      status: 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Retry-After": "3600",
      },
    })
  }

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
