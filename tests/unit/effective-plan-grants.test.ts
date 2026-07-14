import { describe, expect, it } from "vitest"

import {
  type EffectivePlanGrantCandidate,
  resolveEffectivePlanGrant,
} from "@/lib/products/effective-plan-grants"
import { ProductPlanGrantSource } from "@/lib/vendor/prisma/client"

function grant(
  overrides: Partial<EffectivePlanGrantCandidate> &
    Pick<EffectivePlanGrantCandidate, "id" | "source">,
): EffectivePlanGrantCandidate {
  return {
    startsAt: new Date("2026-07-01T00:00:00.000Z"),
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    plan: { price: 10 },
    ...overrides,
  }
}

describe("resolveEffectivePlanGrant", () => {
  it("prefers a verified paid grant over newer admin and leaderboard grants", () => {
    const paid = grant({
      id: "paid",
      source: ProductPlanGrantSource.dodo_payment,
    })
    const admin = grant({
      id: "admin",
      source: ProductPlanGrantSource.admin,
      startsAt: new Date("2026-07-12T00:00:00.000Z"),
      createdAt: new Date("2026-07-12T00:00:00.000Z"),
      plan: { price: 100 },
    })
    const leaderboard = grant({
      id: "leaderboard",
      source: ProductPlanGrantSource.leaderboard,
      startsAt: new Date("2026-07-13T00:00:00.000Z"),
      createdAt: new Date("2026-07-13T00:00:00.000Z"),
      plan: { price: 200 },
    })

    expect(resolveEffectivePlanGrant([leaderboard, admin, paid])).toBe(paid)
  })

  it("uses the grant id as a deterministic final tie-breaker", () => {
    const alpha = grant({
      id: "alpha",
      source: ProductPlanGrantSource.dodo_subscription,
    })
    const zulu = grant({
      id: "zulu",
      source: ProductPlanGrantSource.dodo_payment,
    })

    expect(resolveEffectivePlanGrant([alpha, zulu])).toBe(zulu)
    expect(resolveEffectivePlanGrant([zulu, alpha])).toBe(zulu)
  })

  it("keeps the higher-value paid placement when paid windows overlap", () => {
    const pro = grant({
      id: "older-pro",
      source: ProductPlanGrantSource.dodo_payment,
      startsAt: new Date("2026-07-01T00:00:00.000Z"),
      plan: { price: 999 },
    })
    const featured = grant({
      id: "newer-featured",
      source: ProductPlanGrantSource.dodo_payment,
      startsAt: new Date("2026-07-12T00:00:00.000Z"),
      plan: { price: 499 },
    })

    expect(resolveEffectivePlanGrant([featured, pro])).toBe(pro)
  })

  it("does not mutate the input collection", () => {
    const grants = Object.freeze([
      grant({ id: "admin", source: ProductPlanGrantSource.admin }),
      grant({ id: "paid", source: ProductPlanGrantSource.dodo_payment }),
      grant({
        id: "leaderboard",
        source: ProductPlanGrantSource.leaderboard,
      }),
    ])
    const originalOrder = [...grants]

    expect(resolveEffectivePlanGrant(grants)?.id).toBe("paid")
    expect(grants).toEqual(originalOrder)
    grants.forEach((candidate, index) => {
      expect(candidate).toBe(originalOrder[index])
    })
  })
})
