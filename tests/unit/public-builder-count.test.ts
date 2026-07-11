import { describe, expect, it } from "vitest"

import {
  formatPublicBuilderCountMessage,
  resolvePublicBuilderCount,
} from "@/lib/publicBuilderCount"

describe("public builder count", () => {
  it("uses the configured growth metric as a floor", () => {
    expect(resolvePublicBuilderCount(1500)).toBe(1600)
    expect(formatPublicBuilderCountMessage(1500)).toBe(
      "Join 1,600+ builders launching in public",
    )
  })

  it("uses and rounds down the live database count", () => {
    expect(resolvePublicBuilderCount(1899)).toBe(1899)
    expect(formatPublicBuilderCountMessage(1899)).toBe(
      "Join 1,800+ builders launching in public",
    )
  })
})
