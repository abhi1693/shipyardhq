import { describe, it, expect } from "vitest"
import {
  hasPlanFeature,
  productHasFeature,
  type PlanWithFeatures,
} from "@/lib/features"

describe("features", () => {
  const plan: PlanWithFeatures = {
    assignments: [
      { enabled: true, feature: { key: "alpha" } },
      { enabled: false, feature: { key: "beta" } },
      { enabled: true, feature: { key: "gamma" } },
    ],
  }

  it("hasPlanFeature returns true only for enabled assigned feature", () => {
    expect(hasPlanFeature(plan, "alpha")).toBe(true)
    expect(hasPlanFeature(plan, "beta")).toBe(false)
    expect(hasPlanFeature(plan, "gamma")).toBe(true)
    expect(hasPlanFeature(plan, "nope")).toBe(false)
  })

  it("productHasFeature delegates to plan", () => {
    const product = { plan }
    expect(productHasFeature(product, "alpha")).toBe(true)
    expect(productHasFeature(product, "beta")).toBe(false)
    expect(productHasFeature(null as any, "alpha")).toBe(false)
  })
})
