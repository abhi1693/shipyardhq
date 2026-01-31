import { NextResponse, type NextRequest } from "next/server"

import { fastapiFetch, type FastApiError } from "@/lib/fastapi-fetcher"
import { productPath } from "@/lib/routes"

const isSafeHttpUrl = (rawUrl: string): rawUrl is string => {
  try {
    const url = new URL(rawUrl)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

export async function redirectToProductWebsite(
  request: NextRequest,
  {
    slug,
    utmContent,
  }: {
    slug: string
    utmContent: string
  },
) {
  const fallback = new URL(productPath(slug), request.url)

  try {
    const response = await fastapiFetch<{
      data: { destination: string | null; fallbackPath: string }
      status: number
      headers: Headers
    }>(
      `/api/v1/public/products/${encodeURIComponent(slug)}/redirect?utmContent=${encodeURIComponent(utmContent)}`,
      { method: "GET" },
    )
    const destination = response.data?.destination ?? null
    if (!destination || !isSafeHttpUrl(destination)) {
      return NextResponse.redirect(fallback)
    }

    const apiResponse = NextResponse.redirect(destination, 307)
    apiResponse.headers.set("Cache-Control", "no-store")
    return apiResponse
  } catch (error) {
    const status = (error as FastApiError | undefined)?.status
    if (status === 404 || status === 422) {
      return NextResponse.redirect(fallback)
    }
    return NextResponse.redirect(fallback)
  }

}
