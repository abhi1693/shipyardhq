import type { GuideDefinition } from "@/lib/guides/catalog"
import { EDITORIAL_POLICY_PATH } from "@/lib/routes"
import { siteConfig } from "@/lib/siteConfig"

export function formatGuideDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`))
}

export function getGuideAuthor(guide: GuideDefinition) {
  return (
    guide.author ?? {
      type: "Organization" as const,
      name: "Shipyard HQ Editorial Team",
      url: new URL(EDITORIAL_POLICY_PATH, siteConfig.url).toString(),
    }
  )
}

export function buildGuideArticle(guide: GuideDefinition, pageUrl: string) {
  const author = getGuideAuthor(guide)
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${pageUrl}#article`,
    headline: guide.title,
    description: guide.metaDescription,
    ...(guide.publishedAt ? { datePublished: guide.publishedAt } : {}),
    dateModified: guide.updatedAt,
    mainEntityOfPage: pageUrl,
    author: {
      "@type": author.type,
      name: author.name,
      ...(author.url ? { url: author.url } : {}),
    },
    ...(guide.reviewer
      ? {
          editor: {
            "@type": guide.reviewer.type,
            name: guide.reviewer.name,
            ...(guide.reviewer.url ? { url: guide.reviewer.url } : {}),
          },
        }
      : {}),
    citation: guide.sources?.map((source) => ({
      "@type": "CreativeWork",
      name: source.title,
      url: source.url,
      description: source.supports,
    })),
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
      logo: {
        "@type": "ImageObject",
        url: new URL(siteConfig.logo, siteConfig.url).toString(),
      },
    },
  }
}

export function guideProvenanceMarkdown(guide: GuideDefinition) {
  const author = getGuideAuthor(guide)
  return [
    `By ${author.url ? `[${author.name}](${author.url})` : author.name}`,
    ...(guide.publishedAt ? [`Published: ${guide.publishedAt}`] : []),
    `Updated: ${guide.updatedAt}`,
    ...(guide.factCheckedAt ? [`Fact-checked: ${guide.factCheckedAt}`] : []),
    ...(guide.reviewer ? [`Reviewed by ${guide.reviewer.name}`] : []),
    ...(guide.sources?.length
      ? [
          "",
          "## Sources and evidence",
          "",
          ...guide.sources.map(
            (source) =>
              `- [${source.title}](${source.url}): ${source.supports}`,
          ),
        ]
      : []),
  ]
}
