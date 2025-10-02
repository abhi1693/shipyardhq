import { createProductInsightComprehensiveReport } from "@/lib/server/productInsights"
import type { PipelineStage } from "../types"

export type ReportExecutionResult = Awaited<
  ReturnType<typeof createProductInsightComprehensiveReport>
>

export const reportComprehensiveStage: PipelineStage<
  "report.comprehensive",
  ReportExecutionResult
> = {
  id: "report.comprehensive",
  providerType: "shipyard:model",
  dependencies: [
    "product.snapshot",
    "reddit.discussions",
    "producthunt.launches",
    "hackernews.discussions",
  ],
  retryPolicy: {
    maxAttempts: 2,
  },
  async execute(context) {
    return createProductInsightComprehensiveReport({
      productId: context.productId,
      product: context.product,
      summary: context.shared.summary ?? undefined,
      summaryText: context.shared.summaryText ?? undefined,
      subreddits: context.shared.communities?.subreddits ?? undefined,
      insights: context.shared.discussions?.insights ?? undefined,
      threads: context.shared.discussions?.threads ?? undefined,
      hackerNewsStories: context.shared.hackerNews?.stories ?? undefined,
      productHunt: context.shared.productHunt ?? undefined,
    })
  },
  serialize(result) {
    const data = {
      report: result.report,
      model: result.model,
      generatedAt: new Date().toISOString(),
    }

    return {
      data,
      metrics: {
        highlightCount: result.report.headlineHighlights.length,
        actionCount: result.report.recommendedActions.length,
      },
      shared: {
        report: data,
      },
    }
  },
}
