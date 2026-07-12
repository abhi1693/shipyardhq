export const FREE_TOOL_SLUGS = [
  "serp-preview-meta-tag-generator",
  "open-graph-social-preview-generator",
  "startup-keyword-generator",
  "product-description-seo-grader",
  "seo-url-slug-generator",
  "product-screenshot-alt-text-generator",
  "startup-faq-schema-generator",
  "software-application-schema-generator",
  "robots-txt-ai-crawler-generator",
  "xml-sitemap-generator",
] as const

export type FreeToolSlug = (typeof FREE_TOOL_SLUGS)[number]

export type FreeToolIconName =
  | "search"
  | "share"
  | "keywords"
  | "description"
  | "link"
  | "image"
  | "faq"
  | "schema"
  | "bot"
  | "sitemap"

export type FreeToolCategory =
  | "Search appearance"
  | "Keyword research"
  | "On-page SEO"
  | "Structured data"
  | "Technical SEO"

export interface FreeToolGuideSection {
  title: string
  body: string
}

export interface FreeToolFaq {
  question: string
  answer: string
}

export interface FreeToolDefinition {
  slug: FreeToolSlug
  name: string
  shortName: string
  description: string
  metaDescription: string
  category: FreeToolCategory
  icon: FreeToolIconName
  resultLabel: string
  features: readonly string[]
  guide: readonly FreeToolGuideSection[]
  faqs: readonly FreeToolFaq[]
  relatedTools: readonly FreeToolSlug[]
}
