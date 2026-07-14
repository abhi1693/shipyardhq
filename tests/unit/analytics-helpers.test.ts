import { describe, expect, it } from "vitest"

import {
  extractProductSlug,
  normalizeAnalyticsPath,
} from "@/lib/server/analytics/helpers"

describe("analytics helpers", () => {
  it("normalizes product paths before extracting slugs", () => {
    expect(normalizeAnalyticsPath("/products/OpenClaw/?from=test")).toBe(
      "/products/OpenClaw",
    )
    expect(extractProductSlug("/products/OpenClaw/?from=test")).toBe("openclaw")
  })
})
