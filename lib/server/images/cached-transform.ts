import { createHash } from "node:crypto"

import { blobExists, getBlobPublicUrl, putBlob } from "@/lib/blob"
import { buildSignedImgproxyImageUrl } from "@/lib/images/imgproxy"
import {
  normalizeImageQuality,
  normalizeImageWidth,
  parseManagedMediaImageUrl,
} from "@/lib/images/managed-media"

type CachedTransformParams = {
  src: string
  width: number
  quality?: number | string | null
}

type CachedTransformResult = {
  cacheStatus: "hit" | "miss" | "proxy-fallback"
  url: string
}

const CACHE_FORMAT = "webp"
const CACHE_PREFIX = "image-cache/imgproxy"
const CACHE_VERSION = "v1"
const TRANSFORM_FETCH_TIMEOUT_MS = 20_000

function hashCachePayload(payload: unknown) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex")
}

export function buildCachedTransformedImageKey({
  src,
  width,
  quality,
}: CachedTransformParams) {
  const sourceUrl = parseManagedMediaImageUrl(src)
  if (!sourceUrl) return null

  const normalizedWidth = normalizeImageWidth(width)
  const normalizedQuality = normalizeImageQuality(quality)
  const fingerprint = hashCachePayload({
    format: CACHE_FORMAT,
    quality: normalizedQuality,
    src: sourceUrl.href,
    version: CACHE_VERSION,
    width: normalizedWidth,
  })

  return `${CACHE_PREFIX}/${fingerprint.slice(0, 2)}/${fingerprint}.${CACHE_FORMAT}`
}

export async function getOrCreateCachedTransformedImage({
  src,
  width,
  quality,
}: CachedTransformParams): Promise<CachedTransformResult | null> {
  const sourceUrl = parseManagedMediaImageUrl(src)
  if (!sourceUrl) return null

  const normalizedWidth = normalizeImageWidth(width)
  const normalizedQuality = normalizeImageQuality(quality)
  const cacheKey = buildCachedTransformedImageKey({
    src: sourceUrl.href,
    width: normalizedWidth,
    quality: normalizedQuality,
  })
  if (!cacheKey) return null

  const transformedUrl = await buildSignedImgproxyImageUrl({
    format: CACHE_FORMAT,
    quality: normalizedQuality,
    src: sourceUrl.href,
    width: normalizedWidth,
  })
  if (!transformedUrl) {
    return null
  }

  try {
    if (await blobExists(cacheKey)) {
      return {
        cacheStatus: "hit",
        url: getBlobPublicUrl(cacheKey),
      }
    }

    const response = await fetch(transformedUrl, {
      headers: {
        Accept: "image/webp,image/*;q=0.8",
      },
      signal: AbortSignal.timeout(TRANSFORM_FETCH_TIMEOUT_MS),
    })

    if (!response.ok) {
      return {
        cacheStatus: "proxy-fallback",
        url: transformedUrl,
      }
    }

    const contentType = response.headers
      .get("content-type")
      ?.split(";")[0]
      ?.trim()
      .toLowerCase()

    if (!contentType?.startsWith("image/")) {
      return {
        cacheStatus: "proxy-fallback",
        url: transformedUrl,
      }
    }

    const body = await response.arrayBuffer()
    if (!body.byteLength) {
      return {
        cacheStatus: "proxy-fallback",
        url: transformedUrl,
      }
    }

    const uploaded = await putBlob(cacheKey, body, {
      contentType,
    })

    return {
      cacheStatus: "miss",
      url: uploaded.url,
    }
  } catch (error) {
    console.error("[images] failed to cache transformed image", {
      error,
      sourceUrl: sourceUrl.href,
      width: normalizedWidth,
    })

    return {
      cacheStatus: "proxy-fallback",
      url: transformedUrl,
    }
  }
}
