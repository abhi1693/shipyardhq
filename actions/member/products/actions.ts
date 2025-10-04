"use server"

import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import { dodoClient } from "@/lib/dodo"
import { resolvePlanAssignedAt } from "@/lib/server/planAssignment"
import {
  FeatureEntitlementStatus,
  Prisma,
  ProductStatus,
} from "@/lib/vendor/prisma/client"
import {
  getActiveUserByClerkId,
  INACTIVE_ACCOUNT_MESSAGE,
} from "@/lib/server/userStatus"
import { hasPlanFeature } from "@/lib/features"
import { getRecentProductUpvoters } from "@/lib/server/productUpvotes"
import { memberProductPath } from "@/lib/routes"

import { headers } from "next/headers"
import { redirect } from "next/navigation"

type ListParams = Record<string, string | string[] | undefined>

type OrgMembershipRef = Prisma.OrganizationMembershipGetPayload<{
  select: { organizationId: true }
}>

type ProductListItem = Prisma.ProductGetPayload<{
  include: {
    category: { select: { id: true; name: true; slug: true } }
    plan: {
      select: {
        id: true
        name: true
        assignments: {
          select: {
            enabled: true
            feature: { select: { key: true } }
          }
        }
      }
    }
    verification: { select: { isVerified: true } }
    analytics: { select: { clicks: true; upvotes: true } }
    featureEntitlements: {
      select: { featureKey: true; status: true }
    }
  }
}>

async function getAccessibleOrganizationIds(userId: string) {
  const memberships: OrgMembershipRef[] =
    await prisma.organizationMembership.findMany({
      where: { userId },
      select: { organizationId: true },
    })
  return memberships.map((m) => m.organizationId)
}

export async function getUserProducts(params?: ListParams) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthenticated")
  const user = await getActiveUserByClerkId(userId)
  if (!user) throw new Error(INACTIVE_ACCOUNT_MESSAGE)

  const organizationIds = await getAccessibleOrganizationIds(user.id)

  const verification = (params?.verification as string) || undefined
  const rawStatus = (params?.status as string) || undefined
  const validStatuses: readonly ProductStatus[] = [
    "draft",
    "published",
    "archived",
  ]
  const status =
    rawStatus && validStatuses.includes(rawStatus as ProductStatus)
      ? (rawStatus as ProductStatus)
      : undefined
  const q = ((params?.q as string) || "").trim()
  const sort = (params?.sort as string) || "new"
  const page = Math.max(1, parseInt((params?.page as string) || "1", 10) || 1)
  const limit = Math.max(
    1,
    parseInt((params?.limit as string) || "10", 10) || 10,
  )
  const skip = (page - 1) * limit

  const accessFilter = organizationIds.length
    ? {
        OR: [{ userId: user.id }, { organizationId: { in: organizationIds } }],
      }
    : { userId: user.id }

  const where: any = { ...accessFilter }
  const andFilters: any[] = []

  if (verification === "verified") {
    andFilters.push({ verification: { isVerified: true } })
  } else if (verification === "unverified") {
    andFilters.push({ verification: { isVerified: false } })
  }

  if (status) {
    andFilters.push({ status })
  }

  if (q.length) {
    andFilters.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
      ],
    })
  }

  if (andFilters.length) {
    where.AND = andFilters
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

  const [products, total] = (await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        plan: {
          select: {
            id: true,
            name: true,
            assignments: {
              select: {
                enabled: true,
                feature: { select: { key: true } },
              },
            },
          },
        },
        verification: { select: { isVerified: true } },
        analytics: { select: { clicks: true, upvotes: true } },
        featureEntitlements: {
          where: {
            status: {
              in: [
                FeatureEntitlementStatus.active,
                FeatureEntitlementStatus.pending,
              ],
            },
          },
          select: {
            featureKey: true,
            status: true,
          },
        },
      },
    }),
    prisma.product.count({ where }),
  ])) as [ProductListItem[], number]

  const productsWithPermissions = products.map((product: ProductListItem) => {
    const entitlementFeatures = new Set(
      (product.featureEntitlements ?? []).map((ent) => ent.featureKey),
    )

    const hasAdvancedAnalytics =
      hasPlanFeature(product.plan ?? null, "analytics.advanced") ||
      entitlementFeatures.has("analytics.advanced")
    const canViewAnalytics =
      hasAdvancedAnalytics ||
      hasPlanFeature(product.plan ?? null, "analytics.basic") ||
      entitlementFeatures.has("analytics.basic")

    const { plan, featureEntitlements: _featureEntitlements, ...rest } = product
    void _featureEntitlements
    const planSummary = plan
      ? {
          id: plan.id,
          name: plan.name,
        }
      : undefined

    return {
      ...rest,
      plan: planSummary,
      canDelete: product.userId === user.id,
      canViewAnalytics,
    }
  })

  return { products: productsWithPermissions, total, page, limit }
}

export async function getRecentUpvoters(productId: string, limit = 5) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthenticated")
  const user = await getActiveUserByClerkId(userId)
  if (!user) throw new Error(INACTIVE_ACCOUNT_MESSAGE)
  const ok = await prisma.product.findFirst({
    where: {
      id: productId,
      OR: [
        { userId: user.id },
        { organization: { memberships: { some: { userId: user.id } } } },
      ],
    },
    select: { id: true },
  })
  if (!ok) throw new Error("Not found")
  return getRecentProductUpvoters(productId, limit)
}

// Attach or remove a plan from a product owned by the current user
export async function setProductPlanAction(
  productId: string,
  planId: string | null,
) {
  const { userId } = await auth()
  if (!userId) return { error: "Unauthenticated" }

  const user = await getActiveUserByClerkId(userId)
  if (!user) return { error: INACTIVE_ACCOUNT_MESSAGE }

  const product = await prisma.product.findFirst({
    where: { id: productId, userId: user.id },
    select: {
      id: true,
      planAssignedAt: true,
      plan: { select: { boostForDays: true, isDefault: true } },
    },
  })
  if (!product) return { error: "Product not found or not owned by user" }

  let planAssignedAt: Date | null = null
  if (planId) {
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      select: { id: true, boostForDays: true, isDefault: true },
    })
    if (!plan) return { error: "Plan not found" }
    planAssignedAt = resolvePlanAssignedAt({
      currentPlan: product.plan,
      currentAssignedAt: product.planAssignedAt,
      newPlan: plan,
    })
  }

  await prisma.product.update({
    where: { id: productId },
    data: { planId: planId ?? null, planAssignedAt },
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

  const user = await getActiveUserByClerkId(userId)
  if (!user) return { error: INACTIVE_ACCOUNT_MESSAGE }

  const product = await prisma.product.findFirst({
    where: { id: productId, userId: user.id },
    select: {
      id: true,
      slug: true,
    },
  })
  if (!product) return { error: "Product not found or not owned by user" }

  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    select: { id: true, externalId: true, price: true },
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
    if (host) returnUrl = `${proto}://${host}${memberProductPath(product.slug)}`
  } catch {}

  const customer = {
    email: user.email,
    name: `${user.firstName} ${user.lastName}`.trim(),
    create_new_customer: false,
  } as any

  // Minimal placeholder billing; hosted checkout will collect real details
  const billing = {
    street: "",
    city: "",
    state: "",
    zipcode: "",
    country: "US",
  }

  try {
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
  } catch (e) {
    console.error("Failed to start checkout:", e)
    return { error: "Checkout initialization failed" }
  }
}

// Validate payment by ID and attach plan to product using metadata from Dodo
export async function validatePaymentAndAttachPlan(paymentId: string) {
  const { userId } = await auth()
  if (!userId) return { error: "Unauthenticated" }

  const user = await getActiveUserByClerkId(userId)
  if (!user) return { error: INACTIVE_ACCOUNT_MESSAGE }

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
      where: { id: productId, userId: user.id },
      select: {
        id: true,
        userId: true,
        planAssignedAt: true,
        plan: { select: { boostForDays: true, isDefault: true } },
      },
    })
    if (!product) return { error: "Product not found or not owned" }

    // Attach plan
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      select: { boostForDays: true, isDefault: true },
    })
    if (!plan) return { error: "Plan not found" }
    const planAssignedAt = resolvePlanAssignedAt({
      currentPlan: product.plan,
      currentAssignedAt: product.planAssignedAt,
      newPlan: plan,
    })
    await prisma.product.update({
      where: { id: productId },
      data: { planId, planAssignedAt },
    })
    return { success: true }
  } catch (e) {
    console.error("Payment validation failed:", e)
    return { error: "Payment validation failed" }
  }
}

// Unified server action to choose/upgrade a plan for a product
// Usage from a form: const action = choosePlanAction.bind(null, { productId, redirectPath })
export async function choosePlanAction(
  ctx: { productId: string; redirectPath: string },
  formData: FormData,
) {
  "use server"
  const planId = formData.get("planId")?.toString() || ""
  if (!planId) return

  // Try to start checkout when plan requires payment
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    select: { id: true, externalId: true, price: true },
  })
  if (!plan) return

  // Free plans (no price): attach immediately
  if ((plan.price || 0) === 0) {
    await setProductPlanAction(ctx.productId, planId)
    redirect(`${ctx.redirectPath}?upgraded=1`)
  }

  // Paid plans must have an externalId to start checkout
  if ((plan.price || 0) > 0 && !plan.externalId) {
    redirect(`${ctx.redirectPath}?error=plan_not_configured`)
  }

  // Start hosted checkout for paid plans
  const session = await startPlanCheckoutAction(ctx.productId, planId)
  if ((session as any)?.paymentLink) {
    redirect((session as any).paymentLink)
  }

  // If checkout couldn't be created, do NOT grant the plan
  redirect(`${ctx.redirectPath}?error=checkout_init_failed`)
}
