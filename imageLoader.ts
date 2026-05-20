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
  const transformedUrl = buildCloudflareMediaImageUrl({
    src,
    width,
    quality,
  })
  if (transformedUrl !== src) {
    return transformedUrl
  }

  return src
}
