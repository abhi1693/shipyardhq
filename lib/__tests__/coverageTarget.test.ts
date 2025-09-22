import { describe, expect, it } from "vitest"

import { coverageTarget } from "@/lib/coverageTarget"

describe("coverageTarget", () => {
  it("returns true only for literal true", () => {
    expect(coverageTarget(true)).toBe(true)
    expect(coverageTarget(false)).toBe(false)
    expect(coverageTarget(null)).toBe(false)
  })
})
