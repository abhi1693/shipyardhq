import type { Metadata } from "next"
import { buildSiteSeo, siteConfig } from "@/lib/siteConfig"

const siteSeo = buildSiteSeo()

const baseMetadata = {
  title: {
    default: siteSeo.defaultTitle,
    template: siteSeo.titleTemplate,
  },
  description: siteSeo.description,
  keywords: siteSeo.keywords,
  openGraph: siteSeo.openGraph,
  twitter: siteSeo.twitter,
} satisfies Metadata

const toComparable = (value: string) =>
  value.replace(/[^a-zA-Z0-9]+/g, "").toLowerCase()

const siteComparable = toComparable(siteConfig.name)
const siteComparableSimplified = siteComparable.replace(
  /(hq|inc|llc|co|dev|app)$/,
  "",
)

const isSiteName = (value?: string) => {
  if (!value) return false
  const key = toComparable(value)
  if (!key) return false
  if (key === siteComparable) return true
  if (siteComparableSimplified && key === siteComparableSimplified) return true
  return false
}

const cleanupTitleInput = (value?: string) => {
  if (!value) return undefined
  let result = value.trim()
  if (!result) return undefined

  while (true) {
    const match = result.match(/^(.*?)(\s*[|\-–—]\s*)([^|\-–—]+)$/)
    if (!match) break
    const candidate = match[3]?.trim()
    if (candidate && isSiteName(candidate)) {
      result = match[1].trim()
      continue
    }
    break
  }

  if (isSiteName(result)) {
    return undefined
  }

  return result || undefined
}

const joinTitleSegments = (segments: Array<string | undefined>) => {
  const unique: string[] = []

  for (const segment of segments) {
    if (!segment) continue
    const trimmed = segment.trim()
    if (!trimmed) continue
    const comparable = toComparable(trimmed)
    if (!comparable) continue
    if (unique.some((existing) => toComparable(existing) === comparable)) {
      continue
    }
    unique.push(trimmed)
  }

  if (!unique.length) return undefined
  return unique.join(" | ")
}

const joinTemplateSegments = (segments: Array<string | undefined>) => {
  const unique: string[] = []

  for (const segment of segments) {
    if (!segment) continue
    const trimmed = segment.trim()
    if (!trimmed) continue
    if (trimmed === "%s") {
      if (!unique.includes("%s")) unique.push("%s")
      continue
    }
    const comparable = toComparable(trimmed)
    if (!comparable) continue
    if (
      unique
        .filter((existing) => existing !== "%s")
        .some((existing) => toComparable(existing) === comparable)
    ) {
      continue
    }
    unique.push(trimmed)
  }

  return unique.join(" | ")
}

const normalizeDescription = (value?: string | null) => {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length ? trimmed : undefined
}

const META_DESCRIPTION_MAX_LENGTH = 160

const stripDescriptionMarkup = (value: string) =>
  value
    .replace(/<[^>]*>/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[`*_~>#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

const truncateMetaDescription = (value: string) => {
  if (value.length <= META_DESCRIPTION_MAX_LENGTH) return value

  const truncated = value.slice(0, META_DESCRIPTION_MAX_LENGTH - 3)
  const cleanBreak = truncated.replace(/\s+\S*$/, "").trim()
  return `${cleanBreak || truncated.trim()}...`
}

export function buildMetaDescription(
  ...candidates: Array<string | null | undefined>
) {
  for (const candidate of candidates) {
    const normalized = normalizeDescription(candidate)
    if (!normalized) continue

    const plainText = stripDescriptionMarkup(normalized)
    if (plainText) {
      return truncateMetaDescription(plainText)
    }
  }

  return undefined
}

type TemplateLikeObject = {
  default?: unknown
  template?: unknown
  absolute?: unknown
}

const resolveTemplateString = (value: unknown): string | undefined => {
  if (!value) return undefined
  if (typeof value === "string") return value
  if (typeof value === "object") {
    const candidate = value as TemplateLikeObject
    const absolute = candidate.absolute
    if (typeof absolute === "string" && absolute.trim().length) {
      return absolute
    }
    const defaultValue = candidate.default
    if (typeof defaultValue === "string" && defaultValue.trim().length) {
      return defaultValue
    }
    const template = candidate.template
    if (typeof template === "string" && template.trim().length) {
      return template
    }
  }
  return undefined
}

type SectionMetadataOptions = {
  section?: string
  description?: string
  openGraph?: Metadata["openGraph"]
  twitter?: Metadata["twitter"]
}

type PageMetadataOptions = {
  title?: string
  section?: string
  description?: string
  canonical?: string
  openGraph?: Metadata["openGraph"]
  twitter?: Metadata["twitter"]
}

export function buildSectionMetadata(
  options: SectionMetadataOptions = {},
): Metadata {
  const { section, description, openGraph, twitter } = options

  const sanitizedSection = cleanupTitleInput(section)
  const sectionTitle = sanitizedSection ?? siteSeo.defaultTitle
  const template = sanitizedSection
    ? joinTemplateSegments(["%s", sanitizedSection])
    : siteSeo.titleTemplate
  const descriptionValue = normalizeDescription(description)

  const metadata: Metadata = {
    ...baseMetadata,
    title: {
      default: sectionTitle,
      template,
    },
    description: descriptionValue ?? baseMetadata.description,
  }

  const openGraphResult = {
    ...(baseMetadata.openGraph ?? {}),
    ...(openGraph ?? {}),
  } as NonNullable<Metadata["openGraph"]>

  const overrideOgTitle = cleanupTitleInput(
    resolveTemplateString(openGraph?.title),
  )
  if (overrideOgTitle) {
    openGraphResult.title = overrideOgTitle
  } else if (sanitizedSection) {
    openGraphResult.title =
      joinTitleSegments([sanitizedSection, siteConfig.name]) ??
      baseMetadata.openGraph?.title ??
      sectionTitle
  } else if (!openGraphResult.title) {
    openGraphResult.title = baseMetadata.openGraph?.title ?? sectionTitle
  }

  const openGraphDescription = normalizeDescription(openGraph?.description)
  if (openGraphDescription) {
    openGraphResult.description = openGraphDescription
  } else if (descriptionValue) {
    openGraphResult.description = descriptionValue
  }

  metadata.openGraph = openGraphResult

  const twitterResult = {
    ...(baseMetadata.twitter ?? {}),
    ...(twitter ?? {}),
  } as NonNullable<Metadata["twitter"]>

  const overrideTwitterTitle = cleanupTitleInput(
    resolveTemplateString(twitter?.title),
  )
  if (overrideTwitterTitle) {
    twitterResult.title = overrideTwitterTitle
  } else if (sanitizedSection) {
    twitterResult.title =
      joinTitleSegments([sanitizedSection, siteConfig.name]) ??
      baseMetadata.twitter?.title ??
      sectionTitle
  } else if (!twitterResult.title) {
    twitterResult.title = baseMetadata.twitter?.title ?? sectionTitle
  }

  const twitterDescription = normalizeDescription(twitter?.description)
  if (twitterDescription) {
    twitterResult.description = twitterDescription
  } else if (descriptionValue) {
    twitterResult.description = descriptionValue
  }

  metadata.twitter = twitterResult

  return metadata
}

export function buildPageMetadata(options: PageMetadataOptions = {}): Metadata {
  const { title, section, description, canonical, openGraph, twitter } = options

  const sanitizedTitle = cleanupTitleInput(title)
  const sanitizedSection = cleanupTitleInput(section)
  const descriptionValue = normalizeDescription(description)

  const pageTitle = joinTitleSegments([sanitizedTitle, sanitizedSection])

  const metadata: Metadata = {
    ...baseMetadata,
  }

  if (pageTitle) {
    metadata.title = pageTitle
  }

  if (descriptionValue) {
    metadata.description = descriptionValue
  }

  if (canonical) {
    metadata.alternates = metadata.alternates || {}
    metadata.alternates.canonical = canonical
  }

  if (pageTitle || descriptionValue || canonical || openGraph) {
    const openGraphResult = {
      ...(baseMetadata.openGraph ?? {}),
      ...(openGraph ?? {}),
    } as NonNullable<Metadata["openGraph"]>

    if (canonical && typeof openGraph?.url === "undefined") {
      openGraphResult.url = canonical
    }

    const overrideOgTitle = cleanupTitleInput(
      resolveTemplateString(openGraph?.title),
    )
    if (overrideOgTitle) {
      openGraphResult.title = overrideOgTitle
    } else if (pageTitle) {
      openGraphResult.title = pageTitle
    }

    const openGraphDescription = normalizeDescription(openGraph?.description)
    if (openGraphDescription) {
      openGraphResult.description = openGraphDescription
    } else if (descriptionValue) {
      openGraphResult.description = descriptionValue
    }

    metadata.openGraph = openGraphResult
  }

  if (pageTitle || descriptionValue || twitter) {
    const twitterResult = {
      ...(baseMetadata.twitter ?? {}),
      ...(twitter ?? {}),
    } as NonNullable<Metadata["twitter"]>

    const overrideTwitterTitle = cleanupTitleInput(
      resolveTemplateString(twitter?.title),
    )
    if (overrideTwitterTitle) {
      twitterResult.title = overrideTwitterTitle
    } else if (pageTitle) {
      twitterResult.title = pageTitle
    }

    const twitterDescription = normalizeDescription(twitter?.description)
    if (twitterDescription) {
      twitterResult.description = twitterDescription
    } else if (descriptionValue) {
      twitterResult.description = descriptionValue
    }

    metadata.twitter = twitterResult
  }

  return metadata
}
