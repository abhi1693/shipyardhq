import { describe, it, expect } from "vitest"
import { pluralize } from "@/lib/pluralize"

describe("pluralize", () => {
  it("returns singular when count is 1", () => {
    expect(pluralize(1, "item")).toBe("item")
  })

  it("appends s when plural not provided", () => {
    expect(pluralize(0, "item")).toBe("items")
    expect(pluralize(2, "item")).toBe("items")
  })

  it("uses provided plural form", () => {
    expect(pluralize(3, "person", "people")).toBe("people")
  })
})
