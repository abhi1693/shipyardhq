import { describe, expect, it } from "vitest"

import {
  DEFAULT_HOMEPAGE_FEED_VIEW,
  isHomepageFeedView,
  normalizeHomepageFeedView,
} from "@/lib/homepage/feed-views"

describe("homepage feed view normalization", () => {
  it("recognizes known views", () => {
    expect(isHomepageFeedView("new")).toBe(true)
    expect(isHomepageFeedView("most-clicked")).toBe(false)
  })

  it("rejects unknown views", () => {
    expect(isHomepageFeedView("bogus")).toBe(false)
    expect(isHomepageFeedView(undefined)).toBe(false)
  })

  it("normalizes unknown to fallback", () => {
    expect(normalizeHomepageFeedView("bogus", "new")).toBe("new")
  })

  it("normalizes missing to default", () => {
    expect(normalizeHomepageFeedView(undefined)).toBe(
      DEFAULT_HOMEPAGE_FEED_VIEW,
    )
  })
})
