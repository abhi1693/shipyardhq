import {
  revalidateTag as nextRevalidateTag,
  updateTag as nextUpdateTag,
} from "next/cache"

export const REVALIDATE_PROFILE = "max" as const

export type CacheInvalidationMode = "revalidate" | "update"

const loggedContextlessInvalidation = {
  revalidate: false,
  update: false,
}

function shouldFallbackToRevalidate(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const message = error.message ?? ""
  return (
    message.includes("updateTag") &&
    message.toLowerCase().includes("server action")
  )
}

function isMissingStaticGenerationStore(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return error.message.toLowerCase().includes("static generation store missing")
}

function logSkippedInvalidation(tag: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  const mode = message.includes("updateTag") ? "update" : "revalidate"
  if (loggedContextlessInvalidation[mode]) return

  loggedContextlessInvalidation[mode] = true
  console.warn(
    "[cache] skipped Next cache invalidation outside request context",
    {
      tag,
      error: message,
    },
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
      if (isMissingStaticGenerationStore(error)) {
        logSkippedInvalidation(tag, error)
        return
      }

      if (!shouldFallbackToRevalidate(error)) {
        throw error
      }
    }
  }

  try {
    nextRevalidateTag(tag, REVALIDATE_PROFILE)
  } catch (error) {
    if (isMissingStaticGenerationStore(error)) {
      logSkippedInvalidation(tag, error)
      return
    }

    throw error
  }
}
