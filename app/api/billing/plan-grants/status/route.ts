import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

import {
  orderMeasurementId,
  subscriptionMeasurementId,
} from "@/lib/server/orderMeasurement"
import prisma from "@/lib/prisma"
import { PAID_PLACEMENT_GRANT_SOURCES } from "@/lib/products/placement-grants"
import { getActiveUserByClerkId } from "@/lib/server/userStatus"

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
} as const

function json(body: Record<string, unknown>, status: number = 200) {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  })
}

export async function GET(request: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return json({ error: "unauthorized" }, 401)
  }

  const user = await getActiveUserByClerkId(clerkId)
  if (!user) {
    return json({ error: "inactive_account" }, 403)
  }

  const requestUrl = new URL(request.url)
  const productId = requestUrl.searchParams.get("productId")?.trim() ?? ""
  const planId = requestUrl.searchParams.get("planId")?.trim() ?? ""
  if (!productId || !planId || productId.length > 256 || planId.length > 256) {
    return json({ error: "productId and planId are required" }, 400)
  }

  try {
    const product = await prisma.product.findFirst({
      where: { id: productId, userId: user.id },
      select: { id: true, planId: true },
    })
    if (!product) {
      return json({ error: "product_not_found" }, 404)
    }

    if (product.planId !== planId) {
      return json({ state: "processing" })
    }

    const now = new Date()
    const activeGrant = await prisma.productPlanGrant.findFirst({
      where: {
        productId: product.id,
        planId,
        source: { in: [...PAID_PLACEMENT_GRANT_SOURCES] },
        status: "active",
        startsAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
      select: {
        externalPaymentId: true,
        externalSubscriptionId: true,
        amountCents: true,
      },
    })

    if (!activeGrant) return json({ state: "processing" })
    const orderEventId =
      activeGrant.externalPaymentId && (activeGrant.amountCents ?? 0) > 0
        ? orderMeasurementId(activeGrant.externalPaymentId)
        : undefined
    return json({
      state: "active",
      orderEventId,
      subscriptionEventId: activeGrant.externalSubscriptionId
        ? subscriptionMeasurementId(activeGrant.externalSubscriptionId)
        : undefined,
    })
  } catch (error) {
    console.error("[billing-status] failed to read plan grant", {
      productId,
      planId,
      error,
    })
    return json({ error: "status_unavailable" }, 500)
  }
}
