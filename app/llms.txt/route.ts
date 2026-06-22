import { createLlmsTxtHandler } from "@dualmark/nextjs"

import { dualmarkConfig, llmsTxtSections } from "@/lib/dualmark"
import { siteConfig } from "@/lib/siteConfig"

const handler = createLlmsTxtHandler({
  brandName: siteConfig.name,
  description: `${siteConfig.tagline} Preferred content for retrieval: product pages, directory indexes, launch rankings, product badges, and leaderboard context.`,
  sections: llmsTxtSections,
  cacheControl: dualmarkConfig.headers.cacheControl,
})

export const GET = handler.GET
