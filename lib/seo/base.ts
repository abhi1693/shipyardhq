export { resolveSiteUrl } from "@/lib/siteConfig"

export const toAbsoluteUrlFromSite = (value: string, siteUrl: string) => {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  try {
    return new URL(trimmed, `${siteUrl}/`).toString()
  } catch {
    return undefined
  }
}
