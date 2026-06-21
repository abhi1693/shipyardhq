import { NextResponse } from "next/server"

import { parseManagedMediaImageUrl } from "@/lib/images/managed-media"
import { getOrCreateCachedTransformedImage } from "@/lib/server/images/cached-transform"

const REDIRECT_CACHE_CONTROL = "public, max-age=31536000, immutable"
const FALLBACK_CACHE_CONTROL = "no-store"

function cachedRedirect(url: string, cacheStatus: string, status = 308) {
  const response = NextResponse.redirect(url, status)
  response.headers.set(
    "Cache-Control",
    cacheStatus === "hit" || cacheStatus === "miss"
      ? REDIRECT_CACHE_CONTROL
      : FALLBACK_CACHE_CONTROL,
  )
  response.headers.set("X-Shipyard-Image-Cache", cacheStatus)
  return response
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const imageUrl = requestUrl.searchParams.get("url")
  const width = Number(requestUrl.searchParams.get("w"))
  const quality = requestUrl.searchParams.get("q")

  if (!imageUrl || !Number.isFinite(width) || width <= 0) {
    return new Response("Invalid image cache request", { status: 400 })
  }

  const sourceUrl = parseManagedMediaImageUrl(imageUrl)
  if (!sourceUrl) {
    return new Response("Unsupported image source", { status: 400 })
  }

  const cachedImage = await getOrCreateCachedTransformedImage({
    src: sourceUrl.href,
    width,
    quality,
  })

  if (cachedImage) {
    return cachedRedirect(
      cachedImage.url,
      cachedImage.cacheStatus,
      cachedImage.cacheStatus === "proxy-fallback" ? 307 : 308,
    )
  }

  return cachedRedirect(sourceUrl.href, "source-fallback", 307)
}

export const HEAD = GET
