import { describe, expect, it } from "vitest"

import { buildProductInsightSummaryText } from "@/lib/server/productInsights/summary"
import type { ProductInsightSummary } from "@/lib/server/productInsights/types"

describe("buildSummaryText", () => {
  const baseSummary: ProductInsightSummary = {
    overview: "ExampleApp helps product teams launch faster.",
    valuePropositions: [
      "One dashboard for research, planning, and review",
      "Guided workflows reduce time-to-launch",
    ],
    targetUsers: ["Early-stage SaaS founders", "Product managers"],
    keyFeatures: ["AI-assisted planning", "Collaborative roadmap"],
    painPointsAddressed: ["No single source of truth", "Fragmented tooling"],
    toneAndStyle: ["Confident", "Supportive"],
  }

  it("formats all sections into a readable block", () => {
    const text = buildProductInsightSummaryText(baseSummary)
    expect(text).toBeTruthy()
    expect(text).toContain(baseSummary.overview)
    expect(text).toContain("Value propositions:")
    expect(text).toContain("- One dashboard for research, planning, and review")
    expect(text).toContain("Tone & style:")
    expect(text?.split("\n\n").length).toBeGreaterThanOrEqual(5)
  })

  it("returns null when no meaningful data exists", () => {
    const minimal: ProductInsightSummary = {
      overview: "",
      valuePropositions: [],
      targetUsers: [],
      keyFeatures: [],
      painPointsAddressed: [],
      toneAndStyle: [],
    }

    expect(buildProductInsightSummaryText(minimal)).toBeNull()
  })
})
