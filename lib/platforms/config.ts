import { platformSchemaLabel } from "@/lib/products/page-cache"
import type { Platform } from "@/lib/vendor/prisma/client"

export const PLATFORM_SLUGS = [
  "web",
  "ios",
  "android",
  "mac",
  "windows",
  "linux",
  "chrome",
] as const

export type PlatformSlug = (typeof PLATFORM_SLUGS)[number]

const PLATFORM_VALUE_MAP: Record<PlatformSlug, Platform> = {
  web: "web",
  ios: "ios",
  android: "android",
  mac: "mac",
  windows: "windows",
  linux: "linux",
  chrome: "chrome_extension",
}

const PLATFORM_VALUE_TO_SLUG = Object.entries(PLATFORM_VALUE_MAP).reduce<
  Record<Platform, PlatformSlug>
>(
  (acc, [slug, value]) => {
    acc[value] = slug as PlatformSlug
    return acc
  },
  {} as Record<Platform, PlatformSlug>,
)

const PLATFORM_DESCRIPTION_MAP: Record<PlatformSlug, string> = {
  web: "Browser-based SaaS and web apps built to run on any device.",
  ios: "Native iOS apps for iPhone and iPad from the App Store.",
  android: "Android apps designed for phones and tablets on Google Play.",
  mac: "Native macOS desktop apps tailored for Mac productivity.",
  windows: "Windows desktop software built for PC users and teams.",
  linux: "Linux-ready tools and open-source software for popular distros.",
  chrome: "Chrome extensions and browser add-ons for the Chrome Web Store.",
}

const normalizeSlug = (value?: string | null): PlatformSlug | null => {
  if (!value) return null
  const candidate = value.trim().toLowerCase() as PlatformSlug
  return PLATFORM_SLUGS.includes(candidate) ? candidate : null
}

export function getPlatformMeta(input?: string | null) {
  const slug = normalizeSlug(input)
  if (!slug) return null

  const platformValue = PLATFORM_VALUE_MAP[slug]
  const label =
    platformSchemaLabel(platformValue) ??
    slug.replace(/[-_]+/g, " ").replace(/^\w/, (c) => c.toUpperCase())

  return {
    slug,
    value: platformValue,
    label,
    description: PLATFORM_DESCRIPTION_MAP[slug],
  }
}

export function platformValueFromSlug(slug: PlatformSlug): Platform {
  return PLATFORM_VALUE_MAP[slug]
}

export function getPlatformMetaByValue(value?: string | null) {
  if (!value) return null
  const slug = PLATFORM_VALUE_TO_SLUG[value as Platform]
  if (!slug) return null
  return getPlatformMeta(slug)
}
