"use server"

import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import { dodoClient } from "@/lib/dodo"
import { resolvePlanAssignedAt } from "@/lib/server/planAssignment"
import { createPlanCheckout } from "@/lib/server/dodoCheckout"
import {
  PaymentConnectorProvider,
  PaymentCredentialStatus,
  Prisma,
  ProductStatus,
} from "@/lib/vendor/prisma/client"
import type { FeatureEntitlementStatus } from "@/lib/vendor/prisma/client"
import {
  validateConnectorApiKey,
  upsertPaymentConnector,
} from "@/lib/server/payments/connectors"
import { getDefaultPlanWithFeatures } from "@/lib/server/planDefaults"
import {
  getActiveUserByClerkId,
  INACTIVE_ACCOUNT_MESSAGE,
} from "@/lib/server/userStatus"
import { hasPlanFeature } from "@/lib/features"
import { memberProductPath } from "@/lib/routes"
import type { PaymentConnectorConfig } from "@/lib/server/payments/types"
import { dispatchEventAsync } from "@/lib/server/events"
import { APP_EVENTS } from "@/lib/server/events/constants"
import { fetchDodoCustomerByEmail } from "@/lib/fetchDodoCustomer"

import { headers } from "next/headers"
import { redirect } from "next/navigation"

type ListParams = Record<string, string | string[] | undefined>

const ACTIVE_ENTITLEMENT_STATUSES: FeatureEntitlementStatus[] = [
  "active",
  "pending",
]
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active"])
const SUBSCRIPTION_CHANGE_PRORATION_MODE = "prorated_immediately"

type ProductListItem = Prisma.ProductGetPayload<{
  include: {
    category: { select: { id: true; name: true; slug: true } }
    plan: {
      select: {
        id: true
        name: true
        isDefault: true
        assignments: {
          select: {
            enabled: true
            feature: { select: { key: true } }
          }
        }
      }
    }
    verification: { select: { isVerified: true } }
    analytics: { select: { upvotes: true } }
    featureEntitlements: {
      where: {
        status: { in: FeatureEntitlementStatus[] }
      }
      select: { featureKey: true; status: true }
    }
  }
}>

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) ? parsed : null
}

async function findActiveSubscriptionForProduct(args: {
  email: string
  productId: string
}) {
  const customer = await fetchDodoCustomerByEmail(args.email)
  if (!customer) return null

  let best: any | null = null
  let bestCreatedAt = 0

  for await (const subscription of dodoClient.subscriptions.list({
    customer_id: customer.customer_id,
    page_size: 100,
  } as any)) {
    const status = (subscription?.status || "").toString().toLowerCase()
    if (!ACTIVE_SUBSCRIPTION_STATUSES.has(status)) continue

    const metadata =
      typeof subscription?.metadata === "object" && subscription.metadata
        ? (subscription.metadata as Record<string, unknown>)
        : null
    const metaProductId =
      (metadata?.productId as string | undefined) ||
      (metadata?.product_id as string | undefined)
    if (metaProductId !== args.productId) continue

    const createdAt = parseIsoDate(subscription?.created_at)?.getTime() ?? 0
    if (!best || createdAt > bestCreatedAt) {
      best = subscription
      bestCreatedAt = createdAt
    }
  }

  return best
}

export async function getUserProducts(params?: ListParams) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthenticated")
  const user = await getActiveUserByClerkId(userId)
  if (!user) throw new Error(INACTIVE_ACCOUNT_MESSAGE)

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

  const where: any = { userId: user.id }
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
            isDefault: true,
            assignments: {
              select: {
                enabled: true,
                feature: { select: { key: true } },
              },
            },
          },
        },
        verification: { select: { isVerified: true } },
        analytics: { select: { upvotes: true } },
        featureEntitlements: {
          where: {
            status: { in: ACTIVE_ENTITLEMENT_STATUSES },
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

  // Fallback to the default plan's features when a product has no plan attached
  const defaultPlan = products.some((product) => !product.plan)
    ? await getDefaultPlanWithFeatures()
    : null

  const productsWithPermissions = products.map((product: ProductListItem) => {
    const entitlementFeatures = new Set(
      (product.featureEntitlements ?? []).map((ent) => ent.featureKey),
    )

    const planForAccess = product.plan ?? defaultPlan

    const hasAdvancedAnalytics =
      hasPlanFeature(planForAccess ?? null, "analytics.advanced") ||
      entitlementFeatures.has("analytics.advanced")
    const canViewAnalytics =
      hasAdvancedAnalytics ||
      hasPlanFeature(planForAccess ?? null, "analytics.basic") ||
      entitlementFeatures.has("analytics.basic")

    const { plan, featureEntitlements: _featureEntitlements, ...rest } = product
    void _featureEntitlements
    const planForDisplay = plan ?? defaultPlan
    const planSummary = planForDisplay
      ? {
          id: planForDisplay.id,
          name: planForDisplay.name,
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

// Attach or remove a plan from a product owned by the current user
export async function setProductPlanAction(
  productId: string,
  planId: string | null,
  subscriptionId?: string | null,
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
  let subscriptionIdUpdate: string | null | undefined
  if (planId) {
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      select: { id: true, boostForDays: true, isDefault: true, type: true },
    })
    if (!plan) return { error: "Plan not found" }
    planAssignedAt = resolvePlanAssignedAt({
      currentPlan: product.plan,
      currentAssignedAt: product.planAssignedAt,
      newPlan: plan,
    })
    if (plan.type !== "recurring_price") {
      subscriptionIdUpdate = null
    } else if (subscriptionId !== undefined) {
      subscriptionIdUpdate = subscriptionId
    }
  } else {
    subscriptionIdUpdate = null
  }

  const data: Prisma.ProductUncheckedUpdateInput = {
    planId: planId ?? null,
    planAssignedAt,
  }
  if (subscriptionIdUpdate !== undefined) {
    data.subscriptionId = subscriptionIdUpdate
  }

  await prisma.product.update({
    where: { id: productId },
    data,
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
    select: { id: true, externalId: true, price: true, type: true },
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

  try {
    const checkout = await createPlanCheckout({
      plan: { externalId: plan.externalId!, type: plan.type },
      customer: {
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
      },
      metadata: { productId, planId },
      returnUrl,
    })
    return { redirectUrl: checkout.url }
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
      data: { planId, planAssignedAt, subscriptionId: null },
    })
    return { success: true }
  } catch (e) {
    console.error("Payment validation failed:", e)
    return { error: "Payment validation failed" }
  }
}

// Validate subscription by ID and attach plan to product using metadata from Dodo
export async function validateSubscriptionAndAttachPlan(
  subscriptionId: string,
) {
  const { userId } = await auth()
  if (!userId) return { error: "Unauthenticated" }

  const user = await getActiveUserByClerkId(userId)
  if (!user) return { error: INACTIVE_ACCOUNT_MESSAGE }

  try {
    const subscription = await dodoClient.subscriptions.retrieve(subscriptionId)
    if (!subscription) return { error: "Subscription not found" }

    const status = (subscription.status || "").toString().toLowerCase()
    if (status !== "active") {
      return { error: `Subscription not active: ${subscription.status}` }
    }

    const meta = (subscription.metadata || {}) as any
    const productId = (meta.productId || meta.product_id) as string | undefined
    const planId = (meta.planId || meta.plan_id) as string | undefined
    if (!productId || !planId) {
      return { error: "Missing metadata for product/plan" }
    }

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
    const rawSubscriptionId =
      (subscription as any)?.subscription_id ||
      (subscription as any)?.id ||
      subscriptionId
    const subscriptionExternalId =
      typeof rawSubscriptionId === "string" ? rawSubscriptionId : subscriptionId
    await prisma.product.update({
      where: { id: productId },
      data: { planId, planAssignedAt, subscriptionId: subscriptionExternalId },
    })
    return { success: true }
  } catch (e) {
    console.error("Subscription validation failed:", e)
    return { error: "Subscription validation failed" }
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
    select: { id: true, externalId: true, price: true, type: true },
  })
  if (!plan) return

  const ownership = await requireOwnedProduct(ctx.productId)
  if ("error" in ownership) return

  const currentPlan = await prisma.product.findUnique({
    where: { id: ctx.productId },
    select: {
      plan: {
        select: { type: true, isDefault: true, price: true },
      },
    },
  })
  const activePlan = currentPlan?.plan
  const hasPaidPlan =
    !!activePlan && !activePlan.isDefault && (activePlan.price ?? 0) > 0
  if (hasPaidPlan && activePlan.type !== plan.type) {
    redirect(`${ctx.redirectPath}?error=plan_type_locked`)
  }

  if ((plan.price || 0) > 0 && ownership.product.status !== "published") {
    redirect(`${ctx.redirectPath}?error=must_publish`)
  }

  // Free plans (no price): attach immediately
  if ((plan.price || 0) === 0) {
    await setProductPlanAction(ctx.productId, planId, null)
    redirect(`${ctx.redirectPath}?upgraded=1`)
  }

  // Paid plans must have an externalId to start checkout
  if ((plan.price || 0) > 0 && !plan.externalId) {
    redirect(`${ctx.redirectPath}?error=plan_not_configured`)
  }

  if (
    (plan.price || 0) > 0 &&
    plan.type === "recurring_price" &&
    ownership.user.email
  ) {
    const existingSubscription = await findActiveSubscriptionForProduct({
      email: ownership.user.email,
      productId: ctx.productId,
    })
    const rawSubscriptionId =
      (existingSubscription as any)?.subscription_id ||
      (existingSubscription as any)?.id ||
      null
    const subscriptionId =
      typeof rawSubscriptionId === "string" ? rawSubscriptionId : null
    if (subscriptionId) {
      try {
        const isSamePlan =
          (existingSubscription as any)?.product_id === plan.externalId
        if (!isSamePlan) {
          await dodoClient.subscriptions.changePlan(subscriptionId, {
            product_id: plan.externalId,
            proration_billing_mode: SUBSCRIPTION_CHANGE_PRORATION_MODE,
            quantity: 1,
          } as any)
        }
        await setProductPlanAction(ctx.productId, planId, subscriptionId)
      } catch (error) {
        const status = (error as any)?.status
        const message = String((error as any)?.error?.message || "")
          .trim()
          .toLowerCase()
        if (status === 409 && message.includes("previous payment")) {
          console.warn("Subscription change blocked by pending payment")
          redirect(`${ctx.redirectPath}?error=subscription_payment_pending`)
        }
        console.error("Failed to change subscription plan:", error)
        redirect(`${ctx.redirectPath}?error=subscription_change_failed`)
      }
      redirect(`${ctx.redirectPath}?upgraded=1`)
    }
  }

  // Start hosted checkout for paid plans
  const session = await startPlanCheckoutAction(ctx.productId, planId)
  const redirectUrl = (session as any)?.redirectUrl
  if (redirectUrl) {
    redirect(redirectUrl)
  }

  // If checkout couldn't be created, do NOT grant the plan
  redirect(`${ctx.redirectPath}?error=checkout_init_failed`)
}

async function requireOwnedProduct(productId: string) {
  const { userId } = await auth()
  if (!userId) return { error: "Unauthenticated" as const } as const
  const user = await getActiveUserByClerkId(userId)
  if (!user) return { error: INACTIVE_ACCOUNT_MESSAGE }

  const product = await prisma.product.findFirst({
    where: { id: productId, userId: user.id },
    select: { id: true, slug: true, userId: true, name: true, status: true },
  })
  if (!product)
    return { error: "Product not found or not owned by user" as const } as const

  return { user, product }
}

export async function getProductConnectorSummary(productId: string) {
  const { error } = await requireOwnedProduct(productId)
  if (error) return null

  const connector = await prisma.paymentConnector.findUnique({
    where: { productId },
    select: {
      id: true,
      provider: true,
      status: true,
      lastSyncedAt: true,
      lastSyncError: true,
      latestAllTimeRevenueCents: true,
      latestCurrencyCode: true,
      latestPeriodStart: true,
      config: true,
      credentials: {
        where: { status: PaymentCredentialStatus.active },
        select: { keyHint: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  })

  if (!connector) return null
  const keyHint = connector.credentials?.[0]?.keyHint || null
  const { credentials: _creds, ...rest } = connector
  void _creds
  const config = connector.config as PaymentConnectorConfig | null
  const accountId =
    typeof config?.accountId === "string" ? config.accountId : undefined
  const brandId =
    typeof config?.brandId === "string" ? config.brandId : undefined
  return { ...rest, keyHint, accountId, brandId }
}

export async function saveProductConnectorAction(input: {
  productId: string
  provider: PaymentConnectorProvider | string
  apiKey: string
  accountId?: string
  brandId?: string
}) {
  const guard = await requireOwnedProduct(input.productId)
  if ("error" in guard) return guard

  const provider =
    typeof input.provider === "string"
      ? (input.provider as PaymentConnectorProvider)
      : input.provider
  if (!Object.values(PaymentConnectorProvider).includes(provider)) {
    return { error: "Unsupported payment provider" }
  }
  const apiKey = input.apiKey?.trim()
  if (!apiKey) return { error: "API key is required" }
  const accountId = input.accountId?.trim()
  const brandId = input.brandId?.trim()
  if (provider === PaymentConnectorProvider.polar && !accountId) {
    return { error: "Polar organization ID is required" }
  }
  if (provider === PaymentConnectorProvider.revenuecat && !accountId) {
    return { error: "RevenueCat project ID is required" }
  }
  if (provider === PaymentConnectorProvider.lemonsqueezy && !accountId) {
    return { error: "Lemon Squeezy store ID is required" }
  }
  if (
    provider === PaymentConnectorProvider.paystack &&
    accountId &&
    !accountId.toUpperCase().startsWith("ACCT_")
  ) {
    return { error: "Paystack subaccount codes must start with ACCT_" }
  }
  if (brandId && !brandId.startsWith("brnd_") && !brandId.startsWith("bus_")) {
    return { error: "Dodo brand IDs must start with brnd_ or bus_" }
  }
  if (brandId && provider !== PaymentConnectorProvider.dodo) {
    return { error: "Brand ID is only supported for Dodo" }
  }
  if (provider === PaymentConnectorProvider.dodo && !brandId) {
    return { error: "Brand ID is required for Dodo" }
  }

  try {
    await validateConnectorApiKey({
      productId: input.productId,
      provider,
      apiKey,
      config:
        accountId || brandId
          ? {
              ...(accountId ? { accountId } : {}),
              ...(brandId ? { brandId } : {}),
            }
          : undefined,
    })
    const result = await upsertPaymentConnector({
      productId: input.productId,
      provider,
      apiKey,
      config:
        accountId || brandId
          ? {
              ...(accountId ? { accountId } : {}),
              ...(brandId ? { brandId } : {}),
            }
          : undefined,
    })
    dispatchEventAsync(
      APP_EVENTS.PAYMENTS_CONNECTOR_SYNC,
      { connectorId: result.connector.id },
      {
        context: {
          productId: input.productId,
          connectorId: result.connector.id,
        },
      },
    )
    const summary = await getProductConnectorSummary(input.productId)
    return { ok: true, connectorId: result.connector.id, connector: summary }
  } catch (e: any) {
    return { error: e?.message || "Failed to save connector" }
  }
}
