import { buildCloudflareMediaImageUrl } from "./lib/images/cloudflare"

type ImageLoaderParams = {
  src: string
  width: number
  quality?: number
}

export default function shipyardImageLoader({
  src,
  width,
  quality,
}: ImageLoaderParams) {
  if (src.startsWith("/")) {
    return src
  }

  const normalizedWidth = Math.max(1, Math.round(width))
  const normalizedQuality =
    typeof quality === "number" && Number.isFinite(quality) ? quality : 75
  const transformedUrl = buildCloudflareMediaImageUrl({
    src,
    width: normalizedWidth,
    quality: normalizedQuality,
  })
  if (transformedUrl !== src) {
    return transformedUrl
  }

  const separator = src.includes("?") ? "&" : "?"
  return `${src}${separator}w=${normalizedWidth}&q=${normalizedQuality}`
}
