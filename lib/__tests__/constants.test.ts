import { describe, it, expect } from "vitest"
import {
  IS_PROD,
  BADGE_OPTIONS,
  CURRENCIES,
  PLATFORMS,
  CURRENCY_CODES,
} from "@/lib/constants"

describe("constants", () => {
  it("exposes expected lists and flags", () => {
    expect(typeof IS_PROD).toBe("boolean")
    expect(BADGE_OPTIONS.length).toBeGreaterThan(0)
    expect(CURRENCIES.map((c) => c.code)).toEqual(Array.from(CURRENCY_CODES))
    expect(Array.isArray(PLATFORMS)).toBe(true)
  })
})
