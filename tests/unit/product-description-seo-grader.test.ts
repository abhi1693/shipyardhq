import { describe, expect, it } from "vitest"

import {
  analyzeProductDescriptionPhrases,
  countWholePhraseOccurrences,
} from "@/lib/tools/product-description-seo"

describe("product description SEO phrase analysis", () => {
  it("does not count a focus phrase inside a larger word", () => {
    const analysis = analyzeProductDescriptionPhrases(
      "Email keeps teams connected.",
      "AI",
    )

    expect(analysis.keywordCount).toBe(0)
    expect(analysis.topicStatedEarly).toBe(false)

    const exactMatch = analyzeProductDescriptionPhrases(
      "AI makes email easier.",
      "AI",
    )
    expect(exactMatch.keywordCount).toBe(1)
    expect(exactMatch.topicStatedEarly).toBe(true)
  })

  it("requires whole action and benefit terms", () => {
    const falseMatches = analyzeProductDescriptionPhrases(
      "Helpful resources for startup founders.",
      "",
    )
    expect(falseMatches.hasBenefit).toBe(false)
    expect(falseMatches.hasAction).toBe(false)

    const exactMatches = analyzeProductDescriptionPhrases(
      "Help teams. Start today.",
      "",
    )
    expect(exactMatches.hasBenefit).toBe(true)
    expect(exactMatches.hasAction).toBe(true)
  })

  it("rejects substring traps around multiword grading phrases", () => {
    const falseMatches = analyzeProductDescriptionPhrases(
      "Also you cannot design updates or budget started projects.",
      "",
    )
    expect(falseMatches.hasBenefit).toBe(false)
    expect(falseMatches.hasAction).toBe(false)

    const exactMatches = analyzeProductDescriptionPhrases(
      "So you can sign up and get started.",
      "",
    )
    expect(exactMatches.hasBenefit).toBe(true)
    expect(exactMatches.hasAction).toBe(true)
  })

  it("counts literal phrases at Unicode-aware boundaries", () => {
    expect(countWholePhraseOccurrences("(AI), AI; AI!", "AI")).toBe(3)
    expect(countWholePhraseOccurrences("Use the C++ SDK.", "C++ SDK")).toBe(1)
    expect(countWholePhraseOccurrences("Café tools and caféine.", "café")).toBe(
      1,
    )
    expect(
      countWholePhraseOccurrences(
        "launch launches launching relaunch",
        "launch",
      ),
    ).toBe(1)
  })
})
