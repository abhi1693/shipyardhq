"use server"

import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import { dodoClient } from "@/lib/dodo"
import { PlanType } from "@prisma/client"
import { headers } from "next/headers"

type ListParams = Record<string, string | string[] | undefined>

export async function getUserProducts(params?: ListParams) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthenticated")

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  })

  if (!user) throw new Error("User not found")

  const verification = (params?.verification as string) || undefined
  const status = (params?.status as string) || undefined
  const q = ((params?.q as string) || "").trim()
  const sort = (params?.sort as string) || "new"
  const page = Math.max(1, parseInt((params?.page as string) || "1", 10) || 1)
  const limit = Math.max(
    1,
    parseInt((params?.limit as string) || "10", 10) || 10,
  )
  const skip = (page - 1) * limit

  const where: any = { userId: user.id }

  if (verification === "verified") {
    where.verification = { isVerified: true }
  } else if (verification === "unverified") {
    where.verification = { isVerified: false }
  }

  if (status) {
    where.status = status
  }

  if (q.length) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
    ]
  }

  let orderBy: any = { createdAt: "desc" as const }
  switch (sort) {
    case "updated":
      orderBy = { updatedAt: "desc" }
      break
    case "az":
      orderBy = { name: "asc" }
      break
    case "clicks":
      orderBy = { analytics: { clicks: "desc" } }
      break
    case "upvotes":
      orderBy = { analytics: { upvotes: "desc" } }
      break
    case "new":
    default:
      orderBy = { createdAt: "desc" }
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        verification: { select: { isVerified: true } },
        analytics: { select: { clicks: true, upvotes: true } },
      },
    }),
    prisma.product.count({ where }),
  ])

  return { products, total, page, limit }
}

export async function getProductActivity(
  productId: string,
  days = 30,
  limit = 20,
) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthenticated")
  const owner = await prisma.product.findFirst({
    where: { id: productId, user: { clerkId: userId } },
    select: { id: true, createdAt: true, updatedAt: true },
  })
  if (!owner) throw new Error("Not found")

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const [verified, badges, upvotes] = await Promise.all([
    prisma.productVerification.findMany({
      where: { productId, verifiedAt: { not: null, gte: since } },
      select: { verifiedAt: true },
      orderBy: { verifiedAt: "desc" },
      take: limit,
    }),
    prisma.productBadge.findMany({
      where: { productId, createdAt: { gte: since } },
      select: { id: true, badge: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.productUpvote.findMany({
      where: { productId, createdAt: { gte: since } },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  ])

  type Activity =
    | { type: "product_created"; ts: Date }
    | { type: "product_updated"; ts: Date }
    | { type: "domain_verified"; ts: Date }
    | { type: "badge_assigned"; ts: Date; meta: { badge: string } }
    | { type: "product_upvoted"; ts: Date }

  const list: Activity[] = []
  list.push({ type: "product_created", ts: owner.createdAt as any })
  list.push({ type: "product_updated", ts: owner.updatedAt as any })
  verified.forEach((v) =>
    list.push({ type: "domain_verified", ts: v.verifiedAt as Date }),
  )
  badges.forEach((b) =>
    list.push({
      type: "badge_assigned",
      ts: b.createdAt,
      meta: { badge: b.badge },
    }),
  )
  upvotes.forEach((u) =>
    list.push({ type: "product_upvoted", ts: u.createdAt }),
  )

  list.sort((a, b) => b.ts.getTime() - a.ts.getTime())
  return list.slice(0, limit)
}

export async function getRecentUpvoters(productId: string, limit = 5) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthenticated")
  const ok = await prisma.product.findFirst({
    where: { id: productId, user: { clerkId: userId } },
    select: { id: true },
  })
  if (!ok) throw new Error("Not found")
  const rows = await prisma.productUpvote.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: true },
  })
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    user: {
      id: r.user.id,
      firstName: r.user.firstName,
      lastName: r.user.lastName,
      email: r.user.email,
    },
  }))
}

// Attach or remove a plan from a product owned by the current user
export async function setProductPlanAction(
  productId: string,
  planId: string | null,
) {
  const { userId } = await auth()
  if (!userId) return { error: "Unauthenticated" }

  const product = await prisma.product.findFirst({
    where: { id: productId, user: { clerkId: userId } },
    select: { id: true },
  })
  if (!product) return { error: "Product not found or not owned by user" }

  if (planId) {
    const exists = await prisma.plan.findUnique({ where: { id: planId }, select: { id: true } })
    if (!exists) return { error: "Plan not found" }
  }

  await prisma.product.update({
    where: { id: productId },
    data: { planId: planId ?? null },
  })

  return { success: true }
}

// Start checkout on DodoPayments when plan has externalId
export async function startPlanCheckoutAction(
  productId: string,
  planId: string,
) {
  const { userId } = await auth()
  if (!userId) return { error: "Unauthenticated" }

  const product = await prisma.product.findFirst({
    where: { id: productId, user: { clerkId: userId } },
    select: { id: true, slug: true, user: { select: { id: true, email: true, firstName: true, lastName: true } } },
  })
  if (!product) return { error: "Product not found or not owned by user" }

  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    select: { id: true, externalId: true, type: true, price: true },
  })
  if (!plan) return { error: "Plan not found" }
  if (!plan.externalId || plan.price === 0) {
    return { error: "Checkout not required for this plan" }
  }

  // Build return URL using current host if available
  let returnUrl: string | undefined
  try {
    const hdrs = await headers()
    const host = hdrs.get("x-forwarded-host") || hdrs.get("host")
    const proto = (hdrs.get("x-forwarded-proto") || "https").split(",")[0]
    if (host) returnUrl = `${proto}://${host}/member/products/${product.slug}`
  } catch {}

  const customer = product.user
    ? ({
        email: product.user.email,
        name: `${product.user.firstName} ${product.user.lastName}`.trim(),
        create_new_customer: false,
      } as any)
    : undefined

  // Minimal placeholder billing; hosted checkout will collect real details
  const billing = {
    street: "",
    city: "",
    state: "",
    zipcode: "",
    country: "US",
  }

  try {
    if (plan.type === ("recurring_price" as PlanType)) {
      const session = await dodoClient.subscriptions.create({
        billing,
        customer: customer || ({} as any),
        product_id: plan.externalId,
        quantity: 1,
        metadata: { productId, planId },
        payment_link: true,
        return_url: returnUrl,
      } as any)
      if (session?.payment_link) return { paymentLink: session.payment_link }
      return { error: "Failed to create subscription checkout" }
    } else {
      const session = await dodoClient.payments.create({
        billing,
        customer: customer || ({} as any),
        product_cart: [{ product_id: plan.externalId, quantity: 1 }],
        metadata: { productId, planId },
        payment_link: true,
        return_url: returnUrl,
      } as any)
      if (session?.payment_link) return { paymentLink: session.payment_link }
      return { error: "Failed to create payment checkout" }
    }
  } catch (e) {
    console.error("Failed to start checkout:", e)
    return { error: "Checkout initialization failed" }
  }
}

// Validate payment by ID and attach plan to product using metadata from Dodo
export async function validatePaymentAndAttachPlan(paymentId: string) {
  const { userId } = await auth()
  if (!userId) return { error: "Unauthenticated" }

  try {
    const payment = await dodoClient.payments.retrieve(paymentId)
    if (!payment) return { error: "Payment not found" }

    // Only attach on successful payment
    if (payment.status !== "succeeded") {
      return { error: `Payment not succeeded: ${payment.status}` }
    }

    const meta = (payment.metadata || {}) as any
    const productId = meta.productId as string | undefined
    const planId = meta.planId as string | undefined
    if (!productId || !planId) {
      return { error: "Missing metadata for product/plan" }
    }

    // Ownership check
    const product = await prisma.product.findFirst({
      where: { id: productId, user: { clerkId: userId } },
      select: { id: true },
    })
    if (!product) return { error: "Product not found or not owned" }

    // Attach plan
    await prisma.product.update({ where: { id: productId }, data: { planId } })
    return { success: true }
  } catch (e) {
    console.error("Payment validation failed:", e)
    return { error: "Payment validation failed" }
  }
}
