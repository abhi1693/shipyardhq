import {
  crawlProductWebsite,
  synthesizeProductInsight,
} from "@/lib/server/productInsights"
import { buildProductInsightSummaryText } from "@/lib/server/productInsights/summary"
import type {
  ProductInsightCrawlResult,
  ProductInsightSynthesis,
} from "@/lib/server/productInsights/types"
import type { PipelineStage } from "../types"

export type SnapshotExecutionResult = {
  crawl: ProductInsightCrawlResult
  synthesis: ProductInsightSynthesis
}

export const productSnapshotStage: PipelineStage<
  "product.snapshot",
  SnapshotExecutionResult
> = {
  id: "product.snapshot",
  providerType: "shipyard:web",
  dependencies: [],
  retryPolicy: {
    maxAttempts: 2,
  },
  async execute(context) {
    const crawl = await crawlProductWebsite(context.websiteUrl)
    const synthesis = await synthesizeProductInsight(crawl, context.product)
    return { crawl, synthesis }
  },
  serialize(result) {
    const summary = result.synthesis.summary ?? null
    const summaryText = summary ? buildProductInsightSummaryText(summary) : null

    return {
      data: {
        sitemapUrl: result.crawl.sitemapUrl ?? undefined,
        discoveredUrls: result.crawl.discoveredUrls ?? [],
        pages: result.crawl.pages,
        summary,
        summaryText: summaryText ?? undefined,
        model: result.synthesis.model,
        fetchedAt: result.crawl.fetchedAt,
      },
      metrics: {
        pageCount: result.crawl.pages.length,
        discoveredUrlCount: result.crawl.discoveredUrls.length,
      },
      shared: {
        snapshot: {
          sitemapUrl: result.crawl.sitemapUrl ?? undefined,
          discoveredUrls: result.crawl.discoveredUrls ?? [],
          pages: result.crawl.pages,
          summary,
          summaryText: summaryText ?? undefined,
          model: result.synthesis.model,
          fetchedAt: result.crawl.fetchedAt,
        },
        summary,
        summaryText: summaryText ?? null,
      },
    }
  },
}
