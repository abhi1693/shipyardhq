import { revalidateTag as nextRevalidateTag } from "next/cache"

export const REVALIDATE_PROFILE = "max" as const

export function revalidateTag(tag: string) {
  nextRevalidateTag(tag, REVALIDATE_PROFILE)
}
