import { describe, expect, it } from "vitest"

import {
  buildActivePlacementPlanFilter,
  buildRegularPlacementPlanFilter,
  hasActivePlacementGrant,
  PAID_PLACEMENT_GRANT_SOURCES,
} from "@/lib/products/placement-grants"

const now = new Date("2026-07-13T12:00:00.000Z")

describe("public placement grant eligibility", () => {
  it("requires the current product plan and active grant to match", () => {
    expect(
      hasActivePlacementGrant(
        {
          planId: "pro",
          planGrants: [
            {
              planId: "featured",
              source: "dodo_payment",
              status: "active",
              startsAt: new Date("2026-07-12T12:00:00.000Z"),
              expiresAt: null,
            },
          ],
        },
        ["featured", "pro"],
        now,
      ),
    ).toBe(false)
  })

  it("treats the expiration instant as no longer active", () => {
    expect(
      hasActivePlacementGrant(
        {
          planId: "featured",
          planGrants: [
            {
              planId: "featured",
              source: "dodo_payment",
              status: "active",
              startsAt: new Date("2026-07-01T12:00:00.000Z"),
              expiresAt: now,
            },
          ],
        },
        ["featured"],
        now,
      ),
    ).toBe(false)
  })

  it("builds one exact-match branch per eligible plan", () => {
    expect(buildActivePlacementPlanFilter(["featured", "pro"], now)).toEqual({
      OR: [
        {
          AND: [
            { planId: "featured" },
            {
              planGrants: {
                some: {
                  planId: "featured",
                  source: { in: [...PAID_PLACEMENT_GRANT_SOURCES] },
                  status: "active",
                  startsAt: { lte: now },
                  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
                },
              },
            },
          ],
        },
        {
          AND: [
            { planId: "pro" },
            {
              planGrants: {
                some: {
                  planId: "pro",
                  source: { in: [...PAID_PLACEMENT_GRANT_SOURCES] },
                  status: "active",
                  startsAt: { lte: now },
                  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
                },
              },
            },
          ],
        },
      ],
    })
  })

  it.each(["admin", "leaderboard", "migration"])(
    "rejects active %s grants as paid placement",
    (source) => {
      expect(
        hasActivePlacementGrant(
          {
            planId: "featured",
            planGrants: [
              {
                planId: "featured",
                source,
                status: "active",
                startsAt: new Date("2026-07-01T12:00:00.000Z"),
                expiresAt: null,
              },
            ],
          },
          ["featured"],
          now,
        ),
      ).toBe(false)
    },
  )

  it("defines regular products as the complement of active priority", () => {
    expect(buildRegularPlacementPlanFilter(["featured"], now)).toEqual({
      NOT: buildActivePlacementPlanFilter(["featured"], now),
    })
  })
})
