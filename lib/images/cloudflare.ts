const MEDIA_HOSTNAME = "media.shipyardhq.dev"
const TRANSFORMABLE_IMAGE_PATH = /\.(?:avif|gif|heic|jpe?g|png|webp)$/i

type CloudflareImageLoaderParams = {
  src: string
  width: number
  quality?: number | string
}

function parseTransformableMediaUrl(src: unknown): URL | null {
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
    url.hostname !== MEDIA_HOSTNAME ||
    url.pathname.startsWith("/cdn-cgi/image/") ||
    !TRANSFORMABLE_IMAGE_PATH.test(url.pathname)
  ) {
    return null
  }

  return url
}

export function isCloudflareMediaImageSrc(src: unknown): src is string {
  return Boolean(parseTransformableMediaUrl(src))
}

export function buildCloudflareMediaImageUrl({
  src,
  width,
  quality,
}: CloudflareImageLoaderParams) {
  const sourceUrl = parseTransformableMediaUrl(src)
  if (!sourceUrl) return src

  const normalizedWidth = Math.max(1, Math.round(width))
  const normalizedQuality =
    typeof quality === "number" || typeof quality === "string" ? quality : 75
  const options = [
    `width=${normalizedWidth}`,
    `quality=${normalizedQuality}`,
    "format=auto",
    "metadata=none",
    "onerror=redirect",
  ]

  return `${sourceUrl.origin}/cdn-cgi/image/${options.join(",")}${sourceUrl.pathname}${sourceUrl.search}`
}

export function cloudflareMediaImageLoader(
  params: CloudflareImageLoaderParams,
) {
  return buildCloudflareMediaImageUrl(params)
}
