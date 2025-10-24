"use server"

import { auth } from "@clerk/nextjs/server"

import { checkDomainTxtAction } from "@/actions/admin/products/actions"
import prisma from "@/lib/prisma"
import {
  evaluateClaimEligibility,
  isProductClaimableInGeneral,
} from "@/lib/products/claim"
import { generateVerificationTxtFromWebsite } from "@/lib/products/verification"
import { revalidateProduct, revalidateUser } from "@/lib/cache/revalidate"
import { dispatchEventAsync } from "@/lib/server/events"
import {
  getActiveUserByClerkId,
  INACTIVE_ACCOUNT_MESSAGE,
} from "@/lib/server/userStatus"
import { APP_EVENTS } from "@/lib/server/events/constants"

type ClaimOutcome = { success: true; slug: string } | { error: string }

export async function claimProductAction(
  productId: string,
): Promise<ClaimOutcome> {
  if (!productId) {
    return { error: "Missing product identifier." }
  }

  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return { error: "Please sign in to claim this product." }
  }

  const claimant = await getActiveUserByClerkId(clerkId)
  if (!claimant) {
    return { error: INACTIVE_ACCOUNT_MESSAGE }
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      verification: true,
      user: {
        select: {
          id: true,
          role: true,
        },
      },
    },
  })

  if (!product) {
    return { error: "Product not found." }
  }

  if (!product.websiteUrl) {
    return { error: "Product is missing a website URL to verify ownership." }
  }

  const baseClaimable = isProductClaimableInGeneral({
    isVerified: product.verification?.isVerified ?? false,
    productStatus: product.status,
  })

  if (!baseClaimable) {
    return {
      error:
        "This product is not eligible for claims. Reach out to support if this is unexpected.",
    }
  }

  const eligibility = evaluateClaimEligibility({
    submitterId: product.user?.id ?? product.userId,
    viewerId: claimant.id,
    productStatus: product.status,
    isVerified: product.verification?.isVerified ?? false,
  })

  if (eligibility.status !== "eligible") {
    return { error: eligibility.reason ?? "Unable to claim this product." }
  }

  const dnsResult = await checkDomainTxtAction(product.websiteUrl)
  if ("error" in dnsResult) {
    return {
      error: dnsResult.error ?? "DNS check failed. Please try again later.",
    }
  }
  if (!dnsResult.success) {
    return {
      error: "Verification TXT record not found. Add the record and try again.",
    }
  }

  const verificationTxt =
    dnsResult.expected ??
    product.verification?.verificationTxt ??
    generateVerificationTxtFromWebsite(product.websiteUrl)
  const claimedAt = new Date()
  const previousOwnerId = product.userId

  try {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.product.updateMany({
        where: { id: productId, userId: previousOwnerId },
        data: { userId: claimant.id },
      })

      if (updated.count === 0) {
        throw new Error("CLAIM_CONFLICT")
      }

      await tx.productVerification.upsert({
        where: { productId },
        create: {
          productId,
          verificationTxt,
          isVerified: true,
          verifiedAt: claimedAt,
        },
        update: {
          verificationTxt,
          isVerified: true,
          verifiedAt: claimedAt,
        },
      })
    })
  } catch (error: any) {
    if (error?.message === "CLAIM_CONFLICT") {
      return {
        error:
          "We couldn't transfer ownership because the product has already been claimed.",
      }
    }
    console.error("Failed to claim product", { error, productId })
    return { error: "Failed to claim product. Please try again later." }
  }

  revalidateProduct(product.slug)
  if (previousOwnerId) {
    revalidateUser(previousOwnerId)
  }
  revalidateUser(claimant.id)

  dispatchEventAsync(
    APP_EVENTS.PRODUCT_CLAIMED,
    {
      productId,
      slug: product.slug,
      claimedByUserId: claimant.id,
      previousOwnerId,
      claimedAt,
    },
    { context: { productId } },
  )

  return { success: true, slug: product.slug }
}
