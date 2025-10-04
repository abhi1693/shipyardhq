import { describe, expect, it } from "vitest"

import { parseInteger } from "@/actions/admin/rewards/utils"

describe("parseInteger", () => {
  it("returns null when value is null", () => {
    expect(parseInteger(null, "Daily cap")).toBeNull()
  })

  it("returns null for empty strings", () => {
    expect(parseInteger("   " as FormDataEntryValue, "Lifetime cap")).toBeNull()
  })

  it("parses whole numbers", () => {
    expect(parseInteger("42" as FormDataEntryValue, "Base reward amount")).toBe(
      42,
    )
    expect(parseInteger("0" as FormDataEntryValue, "Cooldown")).toBe(0)
  })

  it("throws on decimals", () => {
    expect(() =>
      parseInteger("1.5" as FormDataEntryValue, "Base reward amount"),
    ).toThrow(/whole number/i)
  })

  it("throws on non-numeric values", () => {
    expect(() =>
      parseInteger("abc" as FormDataEntryValue, "Base reward amount"),
    ).toThrow(/whole number/i)
  })
})
