import { describe, it, expect } from "vitest"

import { resolvePlanAssignedAt } from "@/lib/server/planAssignment"

describe("resolvePlanAssignedAt", () => {
  it("returns null for default plans", () => {
    const result = resolvePlanAssignedAt({
      currentPlan: null,
      currentAssignedAt: null,
      newPlan: { boostForDays: 10, isDefault: true },
      now: new Date("2024-01-01T00:00:00Z"),
    })
    expect(result).toBeNull()
  })

  it("falls back to now when no time remains", () => {
    const now = new Date("2024-01-20T00:00:00Z")
    const result = resolvePlanAssignedAt({
      currentPlan: { boostForDays: 5, isDefault: false },
      currentAssignedAt: new Date("2024-01-01T00:00:00Z"),
      newPlan: { boostForDays: 14, isDefault: false },
      now,
    })
    expect(result?.toISOString()).toBe(now.toISOString())
  })

  it("adds leftover boost time to the new assignment", () => {
    const now = new Date("2024-01-05T00:00:00Z")
    const result = resolvePlanAssignedAt({
      currentPlan: { boostForDays: 14, isDefault: false },
      currentAssignedAt: new Date("2024-01-01T00:00:00Z"),
      newPlan: { boostForDays: 30, isDefault: false },
      now,
    })
    expect(result?.toISOString()).toBe("2024-01-15T00:00:00.000Z")

    const expectedExpiry = new Date("2024-02-14T00:00:00.000Z")
    const actualExpiry = new Date(result!.getTime() + 30 * 24 * 60 * 60 * 1000)
    expect(actualExpiry.toISOString()).toBe(expectedExpiry.toISOString())
  })
})
