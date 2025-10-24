import { describe, expect, it } from "vitest"

import {
  evaluateClaimEligibility,
  isProductClaimableInGeneral,
} from "@/lib/products/claim"

describe("product claim helpers", () => {
  it("considers products claimable when submitted by allowed role and unverified", () => {
    expect(
      isProductClaimableInGeneral({
        isVerified: false,
        productStatus: "published",
      }),
    ).toBe(true)
  })

  it("blocks claims when already verified", () => {
    expect(
      isProductClaimableInGeneral({
        isVerified: true,
        productStatus: "published",
      }),
    ).toBe(false)
  })

  it("marks claims as eligible for different viewer", () => {
    const result = evaluateClaimEligibility({
      submitterId: "owner",
      viewerId: "claimant",
      productStatus: "published",
      isVerified: false,
    })

    expect(result.status).toBe("eligible")
  })

  it("prevents owners from claiming their own listing", () => {
    const result = evaluateClaimEligibility({
      submitterId: "owner",
      viewerId: "owner",
      productStatus: "published",
      isVerified: false,
    })

    expect(result.status).toBe("already-owner")
  })
})
