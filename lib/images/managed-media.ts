export const MEDIA_HOSTNAME = "media.shipyardhq.dev"

const TRANSFORMABLE_IMAGE_PATH = /\.(?:avif|gif|heic|jpe?g|png|webp)$/i
const DEFAULT_IMAGE_QUALITY = 75
const MAX_IMAGE_QUALITY = 100
const MAX_IMAGE_WIDTH = 3840

type ManagedMediaImageLoaderParams = {
  src: string
  width: number
  quality?: number | string | null
}

export function parseManagedMediaImageUrl(src: unknown): URL | null {
  const url = parseTransformableRemoteImageUrl(src)
  if (!url) return null

  if (
    url.hostname !== MEDIA_HOSTNAME ||
    url.pathname.startsWith("/cdn-cgi/image/")
  ) {
    return null
  }

  return url
}

export function parseTransformableRemoteImageUrl(src: unknown): URL | null {
  if (typeof src !== "string" || src.length === 0) {
    return null
  }

  let url: URL
  try {
    url = new URL(src)
  } catch {
    return null
  }

  if (
    url.protocol !== "https:" ||
    url.pathname.startsWith("/_next/image") ||
    !TRANSFORMABLE_IMAGE_PATH.test(url.pathname)
  ) {
    return null
  }

  return url
}

export function isManagedMediaImageSrc(src: unknown): src is string {
  return Boolean(parseManagedMediaImageUrl(src))
}

export function isTransformableRemoteImageSrc(src: unknown): src is string {
  return Boolean(parseTransformableRemoteImageUrl(src))
}

export function normalizeImageWidth(width: number) {
  if (!Number.isFinite(width)) {
    return 1
  }

  return Math.min(MAX_IMAGE_WIDTH, Math.max(1, Math.round(width)))
}

export function normalizeImageQuality(
  quality: number | string | null | undefined,
) {
  const parsedQuality =
    typeof quality === "number"
      ? quality
      : typeof quality === "string" && quality.trim().length > 0
        ? Number(quality)
        : DEFAULT_IMAGE_QUALITY

  if (!Number.isFinite(parsedQuality)) {
    return DEFAULT_IMAGE_QUALITY
  }

  return Math.min(MAX_IMAGE_QUALITY, Math.max(1, Math.round(parsedQuality)))
}

export function buildManagedMediaImageOptimizerUrl({
  src,
  width,
  quality,
}: ManagedMediaImageLoaderParams) {
  const sourceUrl = parseManagedMediaImageUrl(src)
  if (!sourceUrl) return src

  const searchParams = new URLSearchParams({
    url: sourceUrl.href,
    w: String(normalizeImageWidth(width)),
    q: String(normalizeImageQuality(quality)),
  })

  return `/_next/image?${searchParams.toString()}`
}

export function buildRemoteImageOptimizerUrl({
  src,
  width,
  quality,
}: ManagedMediaImageLoaderParams) {
  const sourceUrl = parseTransformableRemoteImageUrl(src)
  if (!sourceUrl) return src

  const searchParams = new URLSearchParams({
    url: sourceUrl.href,
    w: String(normalizeImageWidth(width)),
    q: String(normalizeImageQuality(quality)),
  })

  return `/_next/image?${searchParams.toString()}`
}

export function managedMediaImageLoader(params: ManagedMediaImageLoaderParams) {
  return buildManagedMediaImageOptimizerUrl(params)
}
