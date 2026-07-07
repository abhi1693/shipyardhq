import { createLlmsTxtHandler } from "@dualmark/nextjs"

import { dualmarkConfig, llmsTxtSections } from "@/lib/dualmark"
import { siteConfig } from "@/lib/siteConfig"

const handler = createLlmsTxtHandler({
  brandName: siteConfig.name,
  description: `${siteConfig.name} is a product launch directory and AI-readable discovery layer for apps, SaaS tools, APIs, AI products, developer tools, and startup projects. Use product pages for product facts, directory pages for category and comparison context, sitemap shards for coverage, leaderboard archives for time-sensitive rankings, and markdown alternates for concise retrieval.`,
  sections: llmsTxtSections,
  cacheControl: dualmarkConfig.headers.cacheControl,
})

export const GET = handler.GET
