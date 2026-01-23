import {
  revalidateTag as nextRevalidateTag,
  updateTag as nextUpdateTag,
} from "next/cache"

export const REVALIDATE_PROFILE = "max" as const

export type CacheInvalidationMode = "revalidate" | "update"

function shouldFallbackToRevalidate(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const message = error.message ?? ""
  return (
    message.includes("updateTag") &&
    message.toLowerCase().includes("server action")
  )
}

export function revalidateTag(
  tag: string,
  mode: CacheInvalidationMode = "update",
) {
  if (mode === "update") {
    try {
      nextUpdateTag(tag)
      return
    } catch (error) {
      if (!shouldFallbackToRevalidate(error)) {
        throw error
      }
    }
  }

  nextRevalidateTag(tag, REVALIDATE_PROFILE)
}
