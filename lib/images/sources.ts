import { isCloudflareMediaImageSrc } from "./cloudflare"

export function isLocalImageSrc(src: unknown): src is string {
  return typeof src === "string" && src.startsWith("/") && !src.startsWith("//")
}

export function isOptimizedImageSrc(src: unknown): src is string {
  return isLocalImageSrc(src) || isCloudflareMediaImageSrc(src)
}
