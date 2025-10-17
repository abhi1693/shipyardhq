import { describe, expect, it } from "vitest"

import { productUpdateInputSchema } from "../schema"

describe("productUpdateInputSchema", () => {
  it("accepts a published update with summary", () => {
    const result = productUpdateInputSchema.parse({
      title: "Announcing beta access",
      summary: "Beta program is now open",
      content: "We are opening up a limited beta for early adopters.",
      status: "published",
    })

    expect(result.title).toBe("Announcing beta access")
    expect(result.summary).toBe("Beta program is now open")
    expect(result.content).toContain("limited beta")
    expect(result.status).toBe("published")
  })

  it("allows drafts without a summary", () => {
    const result = productUpdateInputSchema.parse({
      title: "Improvements in progress",
      content:
        "We are polishing the onboarding flow and will share more details soon.",
      status: "draft",
    })

    expect(result.title).toBe("Improvements in progress")
    expect(result.summary).toBeUndefined()
    expect(result.status).toBe("draft")
  })

  it("rejects level-one markdown headings", () => {
    expect(() =>
      productUpdateInputSchema.parse({
        title: "Heading misuse",
        content: "# Not allowed\n\n## Allowed content after demotion",
        status: "published",
      }),
    ).toThrowError()
  })

  it("enforces minimum content length", () => {
    expect(() =>
      productUpdateInputSchema.parse({
        title: "Too short",
        content: "tiny",
        status: "published",
      }),
    ).toThrowError()
  })
})
