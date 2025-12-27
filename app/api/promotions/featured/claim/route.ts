import { NextResponse } from "next/server"

import prisma from "@/lib/prisma"
import { dodoClient } from "@/lib/dodo"
import { createPlanCheckout } from "@/lib/server/dodoCheckout"
import { getRedisClient } from "@/lib/server/redis"
import {
  FEATURED_PROMO_VERSION,
  featuredPromoClaimKey,
  featuredPromoUserStateKey,
  type FeaturedPromoState,
} from "@/lib/server/promotions/featuredPlanPromo"
import { memberProductPath } from "@/lib/routes"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function parseJson<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) ? parsed : null
}

function isValidState(
  state: FeaturedPromoState | null,
): state is FeaturedPromoState {
  if (!state) return false
  if (state.version !== FEATURED_PROMO_VERSION) return false
  if (!state.userId) return false
  if (typeof state.attempts !== "number") return false
  return true
}

function resolveReturnUrl(
  request: Request,
  productSlug: string,
): string | undefined {
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host")
  if (!host) return undefined

  const proto = (request.headers.get("x-forwarded-proto") || "https").split(
    ",",
  )[0]

  return `${proto}://${host}${memberProductPath(productSlug)}`
}

function invalidTokenResponse() {
  return NextResponse.json(
    { error: "Invalid promotion token" },
    { status: 404 },
  )
}

function serviceUnavailableResponse() {
  return NextResponse.json({ error: "Promotion unavailable" }, { status: 503 })
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get("token")?.trim() || ""
  if (!token) {
    return invalidTokenResponse()
  }

  const redis = await getRedisClient()
  if (!redis) {
    console.error("[promotions.featured.claim] missing redis")
    return serviceUnavailableResponse()
  }

  const userId = await redis.get(featuredPromoClaimKey(token))
  if (!userId) {
    return invalidTokenResponse()
  }

  const rawState = await redis.get(featuredPromoUserStateKey(userId))
  const state = parseJson<FeaturedPromoState>(rawState)
  if (!isValidState(state)) {
    return invalidTokenResponse()
  }

  const offer = state.offer
  if (!offer || offer.claimToken !== token) {
    return invalidTokenResponse()
  }

  const offerExpiresAt = parseIsoDate(offer.expiresAt)
  if (!offerExpiresAt || offerExpiresAt <= new Date()) {
    return invalidTokenResponse()
  }

  const [user, product, plan] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
      },
    }),
    prisma.product.findUnique({
      where: { id: offer.productId },
      select: {
        id: true,
        slug: true,
        status: true,
      },
    }),
    prisma.plan.findUnique({
      where: { id: offer.planId },
      select: {
        id: true,
        slug: true,
        externalId: true,
        price: true,
        type: true,
      },
    }),
  ])

  if (!user || user.status !== "active" || !user.email) {
    return invalidTokenResponse()
  }

  if (
    !product ||
    product.slug !== offer.productSlug ||
    product.status !== "published"
  ) {
    return invalidTokenResponse()
  }

  if (!plan || !plan.externalId || plan.slug !== offer.planSlug) {
    return invalidTokenResponse()
  }

  if ((plan.price || 0) <= 0) {
    return invalidTokenResponse()
  }

  const discount = await dodoClient.discounts
    .retrieve(offer.discountId)
    .catch(() => null)
  if (!discount) {
    return invalidTokenResponse()
  }

  const normalizedCode = offer.discountCode.trim().toUpperCase()
  if ((discount.code || "").trim().toUpperCase() !== normalizedCode) {
    return invalidTokenResponse()
  }

  if (!discount.restricted_to?.includes(plan.externalId)) {
    return invalidTokenResponse()
  }

  const discountExpiresAt = parseIsoDate(discount.expires_at ?? null)
  if (discountExpiresAt && discountExpiresAt <= new Date()) {
    return invalidTokenResponse()
  }

  if (
    typeof discount.usage_limit === "number" &&
    discount.usage_limit > 0 &&
    discount.times_used >= discount.usage_limit
  ) {
    return invalidTokenResponse()
  }

  const returnUrl = resolveReturnUrl(request, product.slug)

  try {
    const checkout = await createPlanCheckout({
      plan: { externalId: plan.externalId, type: plan.type },
      customer: {
        email: user.email,
        name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
      },
      metadata: {
        productId: product.id,
        productSlug: product.slug,
        planId: plan.id,
        planSlug: plan.slug,
        promotion: "featured",
        promotionId: offer.transactionId,
        discountCode: offer.discountCode,
      },
      returnUrl,
      discountCode: offer.discountCode,
    })

    return NextResponse.redirect(checkout.url)
  } catch (error) {
    console.error("[promotions.featured.claim] checkout failed", error)
    return serviceUnavailableResponse()
  }
}
