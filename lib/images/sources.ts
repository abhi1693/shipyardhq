import { isManagedMediaImageSrc } from "./managed-media"

export function isLocalImageSrc(src: unknown): src is string {
  return typeof src === "string" && src.startsWith("/") && !src.startsWith("//")
}

export function isOptimizedImageSrc(src: unknown): src is string {
  return isLocalImageSrc(src) || isManagedMediaImageSrc(src)
}
