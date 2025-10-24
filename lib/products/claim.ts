export type ClaimEligibilityStatus =
  | "requires-sign-in"
  | "already-owner"
  | "already-verified"
  | "status-blocked"
  | "eligible"

export interface ClaimEligibilityInput {
  submitterId?: string | null
  viewerId?: string | null
  productStatus?: string | null
  isVerified?: boolean | null
}

export interface ClaimEligibility {
  status: ClaimEligibilityStatus
  reason?: string
}

export function isProductClaimableInGeneral({
  isVerified,
  productStatus,
}: Pick<ClaimEligibilityInput, "isVerified" | "productStatus">): boolean {
  if (isVerified) return false
  if (productStatus && productStatus !== "published") return false
  return true
}

export function evaluateClaimEligibility({
  submitterId,
  viewerId,
  productStatus,
  isVerified,
}: ClaimEligibilityInput): ClaimEligibility {
  if (!viewerId) {
    return {
      status: "requires-sign-in",
      reason: "Sign in to claim this product.",
    }
  }

  if (submitterId && viewerId === submitterId) {
    return {
      status: "already-owner",
      reason: "You already own this product listing.",
    }
  }

  if (isVerified) {
    return {
      status: "already-verified",
      reason: "This product has already been verified by its current owner.",
    }
  }

  if (productStatus && productStatus !== "published") {
    return {
      status: "status-blocked",
      reason: "Only published products may be claimed.",
    }
  }

  return { status: "eligible" }
}
