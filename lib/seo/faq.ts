import { resolveSiteUrl, toAbsoluteUrlFromSite } from "@/lib/seo/base"

export type FaqEntryInput = {
  question: string
  answer: string
}

export type FaqStructuredData = {
  "@context"?: string
  "@type": "FAQPage"
  "@id"?: string
  mainEntity: Array<{
    "@type": "Question"
    name: string
    acceptedAnswer: {
      "@type": "Answer"
      text: string
    }
  }>
}

export type BuildFaqStructuredDataOptions = {
  /**
   * Optional canonical page URL used to derive the `@id` when not provided.
   */
  pageUrl?: string
  /**
   * Override the FAQ `@id`.
   */
  id?: string
}

const sanitizeAnswer = (value: string) => value.trim()

export function buildFaqStructuredData(
  entries: readonly FaqEntryInput[],
  options: BuildFaqStructuredDataOptions = {},
): FaqStructuredData {
  const siteUrl = resolveSiteUrl()
  const normalizedEntries = entries
    .map((entry) => {
      const question = entry.question?.trim()
      const answer = sanitizeAnswer(entry.answer ?? "")
      if (!question || !answer) return null
      return { question, answer }
    })
    .filter((entry): entry is { question: string; answer: string } =>
      Boolean(entry),
    )

  const pageUrl = options.pageUrl
    ? toAbsoluteUrlFromSite(options.pageUrl, siteUrl)
    : undefined

  const id = options.id?.trim() || (pageUrl ? `${pageUrl}#faq` : undefined)

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    ...(id ? { "@id": id } : {}),
    mainEntity: normalizedEntries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: entry.answer,
      },
    })),
  }
}

export const emptyFaqStructuredData = buildFaqStructuredData([])
