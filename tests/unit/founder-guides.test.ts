import { describe, expect, it } from "vitest"

import { GUIDES, GUIDE_SLUGS, getGuide } from "@/lib/guides/catalog"

function guideWordCount(guide: (typeof GUIDES)[number]) {
  return [
    guide.title,
    guide.lede,
    guide.directAnswer,
    ...guide.sections.flatMap((section) => [
      section.title,
      ...section.paragraphs,
      ...("bullets" in section ? section.bullets : []),
    ]),
    ...guide.faqs.flatMap((faq) => [faq.question, faq.answer]),
  ]
    .join(" ")
    .trim()
    .split(/\s+/).length
}

describe("founder guide catalog", () => {
  it("publishes substantial, uniquely routed guides", () => {
    expect(GUIDES).toHaveLength(3)
    expect(new Set(GUIDE_SLUGS).size).toBe(GUIDE_SLUGS.length)

    for (const guide of GUIDES) {
      expect(guideWordCount(guide)).toBeGreaterThanOrEqual(700)
      expect(guide.sections.length).toBeGreaterThanOrEqual(6)
      expect(guide.faqs.length).toBeGreaterThanOrEqual(4)
      expect(getGuide(guide.slug)).toBe(guide)
    }
  })

  it("keeps every related-guide link valid and non-recursive", () => {
    for (const guide of GUIDES) {
      expect(guide.relatedSlugs).not.toContain(guide.slug)
      expect(new Set(guide.relatedSlugs).size).toBe(guide.relatedSlugs.length)
      guide.relatedSlugs.forEach((slug) => expect(getGuide(slug)).toBeTruthy())
    }
  })

  it("states link and authority limitations in the backlink guide", () => {
    const guide = getGuide("startup-backlinks-domain-rating")
    const text = JSON.stringify(guide)

    expect(text).toMatch(/do-follow/i)
    expect(text).toMatch(/sponsored/i)
    expect(text).toMatch(/not a Google score/i)
    expect(text).toMatch(/no single listing can guarantee/i)
  })
})
