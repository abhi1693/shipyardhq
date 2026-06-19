import { buildManagedMediaImageOptimizerUrl } from "./lib/images/managed-media"

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

  if (process.env.NODE_ENV === "development") {
    return src
  }

  const normalizedWidth = Math.max(1, Math.round(width))
  const normalizedQuality =
    typeof quality === "number" && Number.isFinite(quality) ? quality : 75
  const transformedUrl = buildManagedMediaImageOptimizerUrl({
    src,
    width: normalizedWidth,
    quality: normalizedQuality,
  })
  if (transformedUrl !== src) {
    return transformedUrl
  }

  return src
}
