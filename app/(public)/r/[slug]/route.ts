import type { NextRequest } from "next/server"

import { redirectToProductWebsite } from "@/lib/server/redirects/productWebsiteRedirect"

type RouteContext = {
  params: Promise<{
    slug: string
  }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params
  return redirectToProductWebsite(request, {
    slug,
    utmContent: "product-redirect",
  })
}
