import { describe, expect, it } from "vitest"

import { memberFeedbackSchema } from "@/lib/validation/memberFeedback"

describe("memberFeedbackSchema", () => {
  it("accepts optional subject and valid message", () => {
    const result = memberFeedbackSchema.safeParse({
      subject: "UX research",
      message: "The onboarding flow is clear and concise for new users.",
      rating: "5",
    })

    expect(result.success).toBe(true)
  })

  it("allows empty subject", () => {
    const result = memberFeedbackSchema.safeParse({
      subject: "",
      message: "This is at least twenty characters long.",
    })

    expect(result.success).toBe(true)
  })

  it("rejects short subjects when provided", () => {
    const result = memberFeedbackSchema.safeParse({
      subject: "hi",
      message: "The dashboard feels slow when loading analytics data.",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.subject).toBeDefined()
    }
  })

  it("rejects short messages", () => {
    const result = memberFeedbackSchema.safeParse({
      message: "Too short",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.message).toBeDefined()
    }
  })

  it("rejects invalid ratings", () => {
    const result = memberFeedbackSchema.safeParse({
      message: "The new feature is helpful but has a steep learning curve.",
      rating: "6",
    })

    expect(result.success).toBe(false)
  })
})
