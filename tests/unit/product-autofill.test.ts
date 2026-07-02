import { describe, expect, it } from "vitest"

import { normalizeProductAutofill } from "@/lib/productWizard/autofill"

describe("normalizeProductAutofill", () => {
  it("keeps imported SEO fields concise and directory-safe", () => {
    const result = normalizeProductAutofill({
      tagline:
        "A very specific customer support automation workspace for SaaS teams that need triage, routing, analytics, integrations, and more detail than the tagline field should keep",
      description: `# SupportOps AI

SupportOps AI is a customer support automation workspace for SaaS teams that need ticket triage, routing, and response analytics.

${"It adds more context. ".repeat(220)}`,
      keywords: [
        "software",
        "#Customer Support",
        "AI ticket routing",
        "productivity",
        "help desk analytics",
        "AI ticket routing",
        "customer support automation platform with many extra words",
        "SaaS support",
        "triage workflows",
      ],
    })

    expect(result.suggestion.tagline?.length).toBeLessThanOrEqual(110)
    expect(result.suggestion.description).toContain("## SupportOps AI")
    expect(result.suggestion.description).not.toMatch(/(^|\n)#(?!#)/)
    expect(result.suggestion.description?.length).toBeLessThanOrEqual(2400)
    expect(result.suggestion.keywords).toEqual([
      "customer support",
      "ai ticket routing",
      "help desk analytics",
      "saas support",
      "triage workflows",
    ])
  })
})
