import prisma from "@/lib/prisma"
import { readMetadataString } from "@/lib/server/subscriptionMetadata"
import {
  PlanType,
  Prisma,
  ProductPlanGrantSource,
  ProductPlanGrantStatus,
  ProductStatus,
} from "@/lib/vendor/prisma/client"
import { resolveEffectivePlanGrant } from "@/lib/products/effective-plan-grants"
import {
  enqueueProductPlanGrantBoundaryJobs,
  ensureProductPlanGrantBoundaryEvents,
  type ProductPlanGrantBoundaryJob,
} from "@/lib/server/productPlanGrantBoundarySchedule"

const DAY_IN_MS = 24 * 60 * 60 * 1000
const MAX_TRANSACTION_ATTEMPTS = 3
export const UNVERIFIED_SUBSCRIPTION_PLAN_CHANGE_REASON =
  "subscription_plan_change_unverified"

const TERMINAL_GRANT_STATUSES = new Set<ProductPlanGrantStatus>([
  ProductPlanGrantStatus.canceled,
  ProductPlanGrantStatus.expired,
  ProductPlanGrantStatus.refunded,
  ProductPlanGrantStatus.revoked,
])
const PURCHASED_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "cancelled",
  "canceled",
  "expired",
  "on_hold",
  "paused",
])

type DodoCustomerLike = {
  customer_id?: string | null
  email?: string | null
}

export type DodoPaymentLike = {
  payment_id?: string | null
  status?: string | null
  created_at?: string | null
  subscription_id?: string | null
  refund_status?: string | null
  total_amount?: number | null
  currency?: string | null
  checkout_session_id?: string | null
  customer?: DodoCustomerLike | null
  metadata?: unknown
  product_cart?: Array<{
    product_id?: string | null
    quantity?: number | null
  }> | null
  refunds?: DodoRefundLike[] | null
  disputes?: DodoDisputeLike[] | null
}

export type DodoSubscriptionLike = {
  subscription_id?: string | null
  status?: string | null
  created_at?: string | null
  previous_billing_date?: string | null
  next_billing_date?: string | null
  expires_at?: string | null
  product_id?: string | null
  recurring_pre_tax_amount?: number | null
  currency?: string | null
  customer?: DodoCustomerLike | null
  metadata?: unknown
}

export type DodoRefundLike = {
  refund_id?: string | null
  payment_id?: string | null
  status?: string | null
  is_partial?: boolean | null
  created_at?: string | null
  amount?: number | null
}

export type DodoDisputeLike = {
  dispute_id?: string | null
  payment_id?: string | null
  dispute_status?: string | null
  created_at?: string | null
}

export type ProductPlanGrantResult = {
  outcome: "applied" | "recorded" | "duplicate" | "ignored" | "invalid"
  reason?: string
  productId?: string
  grantId?: string
  grantChanged: boolean
  projectionChanged: boolean
}

type GrantWindow = {
  startsAt: Date
  expiresAt: Date
}

type FulfillmentOptions = {
  expectedUserId?: string
  now?: Date
  providerObservedAt?: Date
  planChangePaymentSucceeded?: boolean
}

export type ProductPlanGrantProjectionResult = {
  changed: boolean
  productId: string
  boundaryJobs: ProductPlanGrantBoundaryJob[]
}

export type ProductPlanGrantBoundaryProjectionResult = {
  productId: string
  grantsExpired: number
  projectionChanged: boolean
}

function metadataRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) ? parsed : null
}

function sameInstant(left: Date | null, right: Date | null): boolean {
  if (!left || !right) return left === right
  return left.getTime() === right.getTime()
}

function isRetryableTransactionError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false
  return error.code === "P2002" || error.code === "P2034"
}

async function serializableTransaction<T>(
  operation: (
    tx: Prisma.TransactionClient,
    collectBoundaryJobs: (jobs: readonly ProductPlanGrantBoundaryJob[]) => void,
  ) => Promise<T>,
): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    const boundaryJobs: ProductPlanGrantBoundaryJob[] = []
    try {
      const transactionResult = await prisma.$transaction(
        (tx) =>
          operation(tx, (jobs) => {
            boundaryJobs.push(...jobs)
          }),
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      )

      // prisma.$transaction only resolves after commit. Queue delivery starts
      // here so Redis can neither extend nor roll back the grant transaction.
      enqueueProductPlanGrantBoundaryJobs(boundaryJobs)
      return transactionResult
    } catch (error) {
      lastError = error
      if (
        !isRetryableTransactionError(error) ||
        attempt === MAX_TRANSACTION_ATTEMPTS
      ) {
        throw error
      }
    }
  }

  throw lastError
}

export function resolveOneTimeGrantWindow(
  createdAt: string | null | undefined,
  boostForDays: number | null | undefined,
): GrantWindow | null {
  const startsAt = parseDate(createdAt)
  const durationDays = boostForDays ?? 0
  if (!startsAt || !Number.isFinite(durationDays) || durationDays <= 0) {
    return null
  }

  return {
    startsAt,
    expiresAt: new Date(startsAt.getTime() + durationDays * DAY_IN_MS),
  }
}

export function isGrantWindowActive(
  startsAt: Date,
  expiresAt: Date | null,
  now: Date = new Date(),
): boolean {
  const nowTime = now.getTime()
  return (
    startsAt.getTime() <= nowTime &&
    (!expiresAt || expiresAt.getTime() > nowTime)
  )
}

function result(
  outcome: ProductPlanGrantResult["outcome"],
  options: Omit<ProductPlanGrantResult, "outcome" | "grantChanged"> & {
    grantChanged?: boolean
  },
): ProductPlanGrantResult {
  return { outcome, grantChanged: options.grantChanged ?? false, ...options }
}

/**
 * Projects the effective ledger grant onto Product for backwards-compatible
 * plan relations. Call this inside the same transaction that changes grants,
 * then pass the returned boundaryJobs to enqueueProductPlanGrantBoundaryJobs
 * only after that transaction commits.
 */
export async function projectEffectiveProductPlanGrant(
  tx: Prisma.TransactionClient,
  productId: string,
  now: Date = new Date(),
): Promise<ProductPlanGrantProjectionResult> {
  const [product, activeGrants] = await Promise.all([
    tx.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        planId: true,
        planAssignedAt: true,
        subscriptionId: true,
        status: true,
        publishedAt: true,
      },
    }),
    tx.productPlanGrant.findMany({
      where: {
        productId,
        status: ProductPlanGrantStatus.active,
      },
      select: {
        id: true,
        planId: true,
        startsAt: true,
        expiresAt: true,
        createdAt: true,
        source: true,
        externalSubscriptionId: true,
        plan: { select: { price: true } },
      },
    }),
  ])

  if (!product) {
    return { changed: false, productId, boundaryJobs: [] }
  }

  const activeGrant = resolveEffectivePlanGrant(
    activeGrants.filter((grant) =>
      isGrantWindowActive(grant.startsAt, grant.expiresAt, now),
    ),
  )

  let targetPlanId: string
  let targetAssignedAt: Date | null
  let targetSubscriptionId: string | null

  if (activeGrant) {
    targetPlanId = activeGrant.planId
    targetAssignedAt = activeGrant.startsAt
    targetSubscriptionId =
      activeGrant.source === ProductPlanGrantSource.dodo_subscription
        ? activeGrant.externalSubscriptionId
        : null
  } else {
    const defaultPlan = await tx.plan.findFirst({
      where: { isDefault: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true },
    })
    if (!defaultPlan) {
      throw new Error("No default plan configured; cannot project plan grant")
    }
    targetPlanId = defaultPlan.id
    targetAssignedAt = null
    targetSubscriptionId = null
  }

  const changed =
    product.planId !== targetPlanId ||
    !sameInstant(product.planAssignedAt, targetAssignedAt) ||
    product.subscriptionId !== targetSubscriptionId
  const shouldPublish =
    product.status === ProductStatus.draft &&
    activeGrant !== undefined &&
    (activeGrant.source === ProductPlanGrantSource.dodo_payment ||
      activeGrant.source === ProductPlanGrantSource.dodo_subscription)
  const projectionChanged = changed || shouldPublish

  if (projectionChanged) {
    await tx.product.update({
      where: { id: productId },
      data: {
        planId: targetPlanId,
        planAssignedAt: targetAssignedAt,
        subscriptionId: targetSubscriptionId,
        ...(shouldPublish
          ? {
              status: ProductStatus.published,
              publishedAt: product.publishedAt ?? now,
            }
          : {}),
      },
    })
  }

  const boundarySchedule = await ensureProductPlanGrantBoundaryEvents(tx, {
    productId,
    grants: activeGrants,
    now,
  })

  return {
    changed: projectionChanged,
    productId,
    boundaryJobs: boundarySchedule.jobs,
  }
}

export async function recomputeProductPlanGrantProjectionAtBoundary(
  productId: string,
  now: Date = new Date(),
): Promise<ProductPlanGrantBoundaryProjectionResult> {
  return serializableTransaction(async (tx, collectBoundaryJobs) => {
    const expired = await tx.productPlanGrant.updateMany({
      where: {
        productId,
        status: ProductPlanGrantStatus.active,
        expiresAt: { lte: now },
      },
      data: { status: ProductPlanGrantStatus.expired },
    })
    const projection = await projectEffectiveProductPlanGrant(
      tx,
      productId,
      now,
    )
    collectBoundaryJobs(projection.boundaryJobs)

    return {
      productId,
      grantsExpired: expired.count,
      projectionChanged: projection.changed,
    }
  })
}

async function revokeMigrationShadows(
  tx: Prisma.TransactionClient,
  args: { productId: string; planId: string },
): Promise<number> {
  const update = await tx.productPlanGrant.updateMany({
    where: {
      productId: args.productId,
      planId: args.planId,
      source: ProductPlanGrantSource.migration,
      status: ProductPlanGrantStatus.active,
    },
    data: { status: ProductPlanGrantStatus.revoked },
  })
  return update.count
}

async function recordUserPlanPurchase(
  tx: Prisma.TransactionClient,
  args: { userId: string; planId: string },
) {
  await tx.userPlanPurchase.upsert({
    where: {
      userId_planId: { userId: args.userId, planId: args.planId },
    },
    update: {},
    create: {
      userId: args.userId,
      planId: args.planId,
    },
  })
}

function validateProductOwner(args: {
  expectedUserId?: string
  metadataUserId?: string
  productUserId: string
}): string | null {
  if (args.expectedUserId && args.productUserId !== args.expectedUserId) {
    return "product_not_owned"
  }
  if (args.metadataUserId && args.productUserId !== args.metadataUserId) {
    return "metadata_owner_mismatch"
  }

  return null
}

export async function fulfillDodoOneTimePayment(
  payment: DodoPaymentLike,
  options: FulfillmentOptions = {},
): Promise<ProductPlanGrantResult> {
  const now = options.now ?? new Date()
  const paymentId = payment.payment_id?.trim()
  if (!paymentId) {
    return result("invalid", {
      reason: "missing_payment_id",
      projectionChanged: false,
    })
  }
  if ((payment.status ?? "").toLowerCase() !== "succeeded") {
    return result("ignored", {
      reason: "payment_not_succeeded",
      projectionChanged: false,
    })
  }
  if (payment.subscription_id) {
    return result("ignored", {
      reason: "subscription_payment",
      projectionChanged: false,
    })
  }

  const metadata = metadataRecord(payment.metadata)
  const productId = readMetadataString(metadata, "productId", "product_id")
  const planId = readMetadataString(metadata, "planId", "plan_id")
  const metadataUserId = readMetadataString(metadata, "userId", "user_id")
  if (!productId || !planId) {
    return result("ignored", {
      reason: "not_a_product_plan_payment",
      projectionChanged: false,
    })
  }

  return serializableTransaction(async (tx, collectBoundaryJobs) => {
    const [product, plan, existingGrant] = await Promise.all([
      tx.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          userId: true,
        },
      }),
      tx.plan.findUnique({
        where: { id: planId },
        select: {
          id: true,
          externalId: true,
          type: true,
          price: true,
          boostForDays: true,
          isDefault: true,
        },
      }),
      tx.productPlanGrant.findUnique({
        where: { externalPaymentId: paymentId },
      }),
    ])

    if (!product) {
      return result("ignored", {
        reason: "product_deleted_or_missing",
        productId,
        projectionChanged: false,
      })
    }
    if (
      !plan ||
      plan.type !== PlanType.one_time_price ||
      plan.isDefault ||
      plan.price <= 0
    ) {
      return result("invalid", {
        reason: "invalid_one_time_plan",
        productId,
        projectionChanged: false,
      })
    }

    const ownerError = validateProductOwner({
      expectedUserId: options.expectedUserId,
      metadataUserId,
      productUserId: product.userId,
    })
    if (ownerError) {
      return result("invalid", {
        reason: ownerError,
        productId,
        projectionChanged: false,
      })
    }

    const cartProductIds = (payment.product_cart ?? [])
      .map((item) => item.product_id?.trim())
      .filter((value): value is string => Boolean(value))
    if (
      cartProductIds.length > 0 &&
      (!plan.externalId || !cartProductIds.includes(plan.externalId))
    ) {
      return result("invalid", {
        reason: "payment_cart_plan_mismatch",
        productId,
        projectionChanged: false,
      })
    }

    const window = resolveOneTimeGrantWindow(
      payment.created_at,
      plan.boostForDays,
    )
    if (!window) {
      return result("invalid", {
        reason: "invalid_payment_window",
        productId,
        projectionChanged: false,
      })
    }

    if (
      existingGrant &&
      (existingGrant.productId !== productId || existingGrant.planId !== planId)
    ) {
      return result("invalid", {
        reason: "payment_grant_mismatch",
        productId,
        grantId: existingGrant.id,
        projectionChanged: false,
      })
    }

    if (existingGrant && TERMINAL_GRANT_STATUSES.has(existingGrant.status)) {
      const revokedMigrationGrants = await revokeMigrationShadows(tx, {
        productId,
        planId,
      })
      const projection = await projectEffectiveProductPlanGrant(
        tx,
        productId,
        now,
      )
      collectBoundaryJobs(projection.boundaryJobs)
      return result("duplicate", {
        reason: `grant_${existingGrant.status}`,
        productId,
        grantId: existingGrant.id,
        grantChanged: revokedMigrationGrants > 0,
        projectionChanged: projection.changed,
      })
    }

    const fullyRefunded = payment.refund_status === "full"
    const effectiveStartsAt = existingGrant?.startsAt ?? window.startsAt
    const effectiveExpiresAt = existingGrant
      ? existingGrant.expiresAt
      : window.expiresAt
    const activeNow =
      !fullyRefunded &&
      effectiveExpiresAt !== null &&
      isGrantWindowActive(effectiveStartsAt, effectiveExpiresAt, now)
    const windowExpired =
      effectiveExpiresAt === null ||
      effectiveExpiresAt.getTime() <= now.getTime()
    const status = fullyRefunded
      ? ProductPlanGrantStatus.refunded
      : windowExpired
        ? ProductPlanGrantStatus.expired
        : ProductPlanGrantStatus.active

    const grant = existingGrant
      ? await tx.productPlanGrant.update({
          where: { id: existingGrant.id },
          data: {
            status,
            ...(status === ProductPlanGrantStatus.refunded
              ? { refundedAt: now }
              : {}),
          },
        })
      : await tx.productPlanGrant.create({
          data: {
            productId,
            planId,
            externalPaymentId: paymentId,
            externalCustomerId: payment.customer?.customer_id?.trim() || null,
            source: ProductPlanGrantSource.dodo_payment,
            startsAt: window.startsAt,
            expiresAt: window.expiresAt,
            status,
            amountCents:
              typeof payment.total_amount === "number"
                ? payment.total_amount
                : null,
            currencyCode: payment.currency?.toString() ?? null,
            metadata: {
              durationDays: plan.boostForDays,
              ...(payment.checkout_session_id
                ? { checkoutSessionId: payment.checkout_session_id }
                : {}),
            },
          },
        })

    await recordUserPlanPurchase(tx, { userId: product.userId, planId })

    const revokedMigrationGrants = await revokeMigrationShadows(tx, {
      productId,
      planId,
    })
    const projection = await projectEffectiveProductPlanGrant(
      tx,
      productId,
      now,
    )
    collectBoundaryJobs(projection.boundaryJobs)
    return result(activeNow ? "applied" : "recorded", {
      reason: fullyRefunded
        ? "payment_fully_refunded"
        : windowExpired
          ? "payment_expired"
          : activeNow
            ? undefined
            : "payment_pending_start",
      productId,
      grantId: grant.id,
      grantChanged:
        !existingGrant ||
        existingGrant.status !== status ||
        revokedMigrationGrants > 0,
      projectionChanged: projection.changed,
    })
  })
}

function subscriptionGrantStatus(
  status: string | null | undefined,
): ProductPlanGrantStatus | null {
  switch ((status ?? "").toLowerCase()) {
    case "active":
      return ProductPlanGrantStatus.active
    case "cancelled":
    case "canceled":
      return ProductPlanGrantStatus.canceled
    case "expired":
      return ProductPlanGrantStatus.expired
    case "failed":
    case "on_hold":
    case "pending":
    case "paused":
      return ProductPlanGrantStatus.revoked
    default:
      return null
  }
}

export async function syncDodoSubscriptionGrant(
  subscription: DodoSubscriptionLike,
  options: FulfillmentOptions = {},
): Promise<ProductPlanGrantResult> {
  const now = options.now ?? new Date()
  const providerObservedAt =
    options.providerObservedAt &&
    Number.isFinite(options.providerObservedAt.getTime())
      ? options.providerObservedAt
      : now
  const externalSubscriptionId = subscription.subscription_id?.trim()
  const status = subscriptionGrantStatus(subscription.status)
  if (!externalSubscriptionId || !status) {
    return result("ignored", {
      reason: !externalSubscriptionId
        ? "missing_subscription_id"
        : "subscription_status_not_actionable",
      projectionChanged: false,
    })
  }

  const metadata = metadataRecord(subscription.metadata)
  const metadataProductId = readMetadataString(
    metadata,
    "productId",
    "product_id",
  )
  const metadataPlanId = readMetadataString(metadata, "planId", "plan_id")
  const metadataUserId = readMetadataString(metadata, "userId", "user_id")

  return serializableTransaction(async (tx, collectBoundaryJobs) => {
    const existingGrant = await tx.productPlanGrant.findUnique({
      where: { externalSubscriptionId },
    })
    const productId = metadataProductId ?? existingGrant?.productId
    if (!productId) {
      return result("ignored", {
        reason: "not_a_product_plan_subscription",
        projectionChanged: false,
      })
    }

    const existingMetadata = metadataRecord(existingGrant?.metadata)
    const previousObservedAt = parseDate(
      typeof existingMetadata?.providerObservedAt === "string"
        ? existingMetadata.providerObservedAt
        : null,
    )
    if (
      previousObservedAt &&
      (previousObservedAt.getTime() > providerObservedAt.getTime() ||
        (previousObservedAt.getTime() === providerObservedAt.getTime() &&
          existingGrant?.status !== ProductPlanGrantStatus.active &&
          status === ProductPlanGrantStatus.active))
    ) {
      return result("duplicate", {
        reason: "stale_subscription_snapshot",
        productId,
        grantId: existingGrant?.id,
        projectionChanged: false,
      })
    }

    const planSelect = { id: true, type: true, isDefault: true } as const
    const planByExternalId = subscription.product_id
      ? await tx.plan.findUnique({
          where: { externalId: subscription.product_id },
          select: planSelect,
        })
      : null
    if (
      subscription.product_id &&
      !planByExternalId &&
      status === ProductPlanGrantStatus.active
    ) {
      return result("invalid", {
        reason: "provider_subscription_plan_not_found",
        productId,
        grantId: existingGrant?.id,
        projectionChanged: false,
      })
    }
    const planByMetadata = metadataPlanId
      ? await tx.plan.findUnique({
          where: { id: metadataPlanId },
          select: planSelect,
        })
      : null
    const verifiedBaselinePlanId = existingGrant?.planId ?? planByMetadata?.id
    const providerPlanChanged = Boolean(
      planByExternalId &&
      verifiedBaselinePlanId &&
      verifiedBaselinePlanId !== planByExternalId.id,
    )
    const planChangeUnverified =
      status === ProductPlanGrantStatus.active &&
      providerPlanChanged &&
      options.planChangePaymentSucceeded !== true
    const shouldKeepVerifiedBaseline = Boolean(
      verifiedBaselinePlanId &&
      (!planByExternalId ||
        (providerPlanChanged && options.planChangePaymentSucceeded !== true)),
    )
    const verifiedExistingPlanId =
      shouldKeepVerifiedBaseline && existingGrant ? existingGrant.planId : null
    const planByExistingGrant = verifiedExistingPlanId
      ? await tx.plan.findUnique({
          where: { id: verifiedExistingPlanId },
          select: planSelect,
        })
      : null
    const plan = shouldKeepVerifiedBaseline
      ? (planByExistingGrant ?? planByMetadata)
      : (planByExternalId ?? planByMetadata)
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        userId: true,
      },
    })

    if (!product) {
      return result("ignored", {
        reason: "product_deleted_or_missing",
        productId,
        projectionChanged: false,
      })
    }
    if (!plan || plan.type !== PlanType.recurring_price || plan.isDefault) {
      return result("invalid", {
        reason: "invalid_recurring_plan",
        productId,
        projectionChanged: false,
      })
    }
    const ownerError = validateProductOwner({
      expectedUserId: options.expectedUserId,
      metadataUserId,
      productUserId: product.userId,
    })
    if (ownerError) {
      return result("invalid", {
        reason: ownerError,
        productId,
        projectionChanged: false,
      })
    }
    if (existingGrant && existingGrant.productId !== productId) {
      return result("invalid", {
        reason: "subscription_grant_mismatch",
        productId,
        grantId: existingGrant.id,
        projectionChanged: false,
      })
    }

    const startsAt =
      parseDate(subscription.previous_billing_date) ??
      parseDate(subscription.created_at) ??
      existingGrant?.startsAt ??
      now
    const expiresAt =
      parseDate(subscription.next_billing_date) ??
      parseDate(subscription.expires_at) ??
      existingGrant?.expiresAt ??
      null
    const externalCustomerId =
      subscription.customer?.customer_id?.trim() ||
      existingGrant?.externalCustomerId ||
      null
    const amountCents =
      typeof subscription.recurring_pre_tax_amount === "number"
        ? subscription.recurring_pre_tax_amount
        : (existingGrant?.amountCents ?? null)
    const currencyCode =
      subscription.currency?.toString() ?? existingGrant?.currencyCode ?? null
    const grantChanged =
      !existingGrant ||
      existingGrant.planId !== plan.id ||
      existingGrant.source !== ProductPlanGrantSource.dodo_subscription ||
      !sameInstant(existingGrant.startsAt, startsAt) ||
      !sameInstant(existingGrant.expiresAt, expiresAt) ||
      existingGrant.status !== status ||
      existingGrant.externalCustomerId !== externalCustomerId ||
      existingGrant.amountCents !== amountCents ||
      existingGrant.currencyCode !== currencyCode

    const grant = await tx.productPlanGrant.upsert({
      where: { externalSubscriptionId },
      create: {
        productId,
        planId: plan.id,
        externalSubscriptionId,
        externalCustomerId,
        source: ProductPlanGrantSource.dodo_subscription,
        startsAt,
        expiresAt,
        status,
        amountCents,
        currencyCode,
        metadata: {
          providerStatus: subscription.status ?? "unknown",
          providerObservedAt: providerObservedAt.toISOString(),
          providerPlanId: subscription.product_id ?? null,
          planChangePaymentVerified:
            options.planChangePaymentSucceeded === true,
        },
      },
      update: {
        planId: plan.id,
        source: ProductPlanGrantSource.dodo_subscription,
        externalCustomerId,
        startsAt,
        expiresAt,
        status,
        amountCents,
        currencyCode,
        metadata: {
          providerStatus: subscription.status ?? "unknown",
          providerObservedAt: providerObservedAt.toISOString(),
          providerPlanId: subscription.product_id ?? null,
          planChangePaymentVerified:
            options.planChangePaymentSucceeded === true,
        },
      },
    })
    if (
      PURCHASED_SUBSCRIPTION_STATUSES.has(
        (subscription.status ?? "").toLowerCase(),
      )
    ) {
      await recordUserPlanPurchase(tx, {
        userId: product.userId,
        planId: plan.id,
      })
    }
    const projection = await projectEffectiveProductPlanGrant(
      tx,
      productId,
      now,
    )
    collectBoundaryJobs(projection.boundaryJobs)

    return result(
      !grantChanged
        ? "duplicate"
        : status === ProductPlanGrantStatus.active
          ? "applied"
          : "recorded",
      {
        reason: planChangeUnverified
          ? UNVERIFIED_SUBSCRIPTION_PLAN_CHANGE_REASON
          : !grantChanged
            ? "subscription_unchanged"
            : `subscription_${subscription.status ?? "unknown"}`,
        productId,
        grantId: grant.id,
        grantChanged,
        projectionChanged: projection.changed,
      },
    )
  })
}

export async function refundDodoOneTimePayment(
  payment: DodoPaymentLike,
  refund: DodoRefundLike,
  options: FulfillmentOptions = {},
): Promise<ProductPlanGrantResult> {
  if (refund.status !== "succeeded") {
    return result("ignored", {
      reason: "refund_not_succeeded",
      projectionChanged: false,
    })
  }
  if (refund.is_partial && payment.refund_status !== "full") {
    return result("ignored", {
      reason: "partial_refund",
      projectionChanged: false,
    })
  }
  if (payment.subscription_id) {
    return result("ignored", {
      reason: "subscription_refund_uses_subscription_state",
      projectionChanged: false,
    })
  }

  const paymentId = payment.payment_id?.trim() || refund.payment_id?.trim()
  const refundId = refund.refund_id?.trim()
  if (!paymentId || !refundId) {
    return result("invalid", {
      reason: "missing_refund_identity",
      projectionChanged: false,
    })
  }

  let knownGrant = await prisma.productPlanGrant.findUnique({
    where: { externalPaymentId: paymentId },
  })
  if (!knownGrant) {
    // A refund can be the first delivery we receive. Create the missing grant
    // directly in a terminal state so no reader can observe a transient active
    // entitlement between fulfillment and refund processing.
    const fulfillment = await fulfillDodoOneTimePayment(
      {
        ...payment,
        payment_id: paymentId,
        refund_status: "full",
      },
      options,
    )
    if (
      !fulfillment.productId ||
      fulfillment.outcome === "invalid" ||
      fulfillment.outcome === "ignored"
    ) {
      return fulfillment
    }
    knownGrant = await prisma.productPlanGrant.findUnique({
      where: { externalPaymentId: paymentId },
    })
    if (!knownGrant) {
      return result("invalid", {
        reason: "payment_grant_not_found",
        productId: fulfillment.productId,
        projectionChanged: false,
      })
    }
  }

  const productId = knownGrant.productId
  const now = options.now ?? new Date()
  return serializableTransaction(async (tx, collectBoundaryJobs) => {
    const grant = await tx.productPlanGrant.findUnique({
      where: { externalPaymentId: paymentId },
    })
    if (!grant) {
      return result("invalid", {
        reason: "payment_grant_not_found",
        productId,
        projectionChanged: false,
      })
    }
    if (grant.externalRefundId && grant.externalRefundId !== refundId) {
      return result("duplicate", {
        reason: `grant_${grant.status}`,
        productId,
        grantId: grant.id,
        projectionChanged: false,
      })
    }

    const refundedGrant = await tx.productPlanGrant.update({
      where: { id: grant.id },
      data: {
        status: ProductPlanGrantStatus.refunded,
        refundedAt: parseDate(refund.created_at) ?? now,
        externalRefundId: refundId,
      },
    })
    const revokedMigrationGrants = await revokeMigrationShadows(tx, {
      productId,
      planId: grant.planId,
    })
    const projection = await projectEffectiveProductPlanGrant(
      tx,
      productId,
      now,
    )
    collectBoundaryJobs(projection.boundaryJobs)
    return result("recorded", {
      reason: "payment_refunded",
      productId,
      grantId: refundedGrant.id,
      grantChanged:
        grant.status !== ProductPlanGrantStatus.refunded ||
        grant.externalRefundId !== refundId ||
        revokedMigrationGrants > 0,
      projectionChanged: projection.changed,
    })
  })
}

export async function revokeDodoOneTimePaymentForDispute(
  payment: DodoPaymentLike,
  dispute: DodoDisputeLike,
  options: FulfillmentOptions = {},
): Promise<ProductPlanGrantResult> {
  const disputeStatus = dispute.dispute_status?.toLowerCase()
  if (
    disputeStatus !== "dispute_lost" &&
    disputeStatus !== "dispute_accepted"
  ) {
    return result("ignored", {
      reason: "dispute_not_terminal",
      projectionChanged: false,
    })
  }
  if (payment.subscription_id) {
    return result("ignored", {
      reason: "subscription_dispute_uses_subscription_state",
      projectionChanged: false,
    })
  }

  const paymentId = payment.payment_id?.trim() || dispute.payment_id?.trim()
  const disputeId = dispute.dispute_id?.trim()
  if (!paymentId || !disputeId) {
    return result("invalid", {
      reason: "missing_dispute_identity",
      projectionChanged: false,
    })
  }

  let knownGrant = await prisma.productPlanGrant.findUnique({
    where: { externalPaymentId: paymentId },
  })
  const grantWasKnownBeforeDispute = knownGrant !== null
  if (!knownGrant) {
    const fulfillment = await fulfillDodoOneTimePayment(
      { ...payment, payment_id: paymentId, refund_status: "full" },
      options,
    )
    if (
      !fulfillment.productId ||
      fulfillment.outcome === "invalid" ||
      fulfillment.outcome === "ignored"
    ) {
      return fulfillment
    }
    knownGrant = await prisma.productPlanGrant.findUnique({
      where: { externalPaymentId: paymentId },
    })
    if (!knownGrant) {
      return result("invalid", {
        reason: "payment_grant_not_found",
        productId: fulfillment.productId,
        projectionChanged: false,
      })
    }
  }

  const productId = knownGrant.productId
  const now = options.now ?? new Date()
  return serializableTransaction(async (tx, collectBoundaryJobs) => {
    const grant = await tx.productPlanGrant.findUnique({
      where: { externalPaymentId: paymentId },
    })
    if (!grant) {
      return result("invalid", {
        reason: "payment_grant_not_found",
        productId,
        projectionChanged: false,
      })
    }

    const existingMetadata = metadataRecord(grant.metadata) ?? {}
    const terminalStatus =
      grantWasKnownBeforeDispute &&
      grant.status === ProductPlanGrantStatus.refunded
        ? ProductPlanGrantStatus.refunded
        : ProductPlanGrantStatus.revoked
    const revokedGrant = await tx.productPlanGrant.update({
      where: { id: grant.id },
      data: {
        status: terminalStatus,
        ...(terminalStatus === ProductPlanGrantStatus.revoked
          ? { refundedAt: null }
          : {}),
        metadata: {
          ...existingMetadata,
          disputeId,
          disputeStatus,
          disputeOccurredAt:
            parseDate(dispute.created_at)?.toISOString() ?? now.toISOString(),
        },
      },
    })
    const revokedMigrationGrants = await revokeMigrationShadows(tx, {
      productId,
      planId: grant.planId,
    })
    const projection = await projectEffectiveProductPlanGrant(
      tx,
      productId,
      now,
    )
    collectBoundaryJobs(projection.boundaryJobs)
    return result("recorded", {
      reason: disputeStatus,
      productId,
      grantId: revokedGrant.id,
      grantChanged:
        grant.status !== terminalStatus || revokedMigrationGrants > 0,
      projectionChanged: projection.changed,
    })
  })
}

function latestProviderRecord<T extends { created_at?: string | null }>(
  records: readonly T[],
): T | undefined {
  return [...records].sort((left, right) => {
    const leftTime = parseDate(left.created_at)?.getTime() ?? 0
    const rightTime = parseDate(right.created_at)?.getTime() ?? 0
    return rightTime - leftTime
  })[0]
}

/**
 * Reconciles the complete provider payment snapshot. Terminal disputes take
 * precedence over refunds, which take precedence over ordinary fulfillment.
 */
export async function reconcileDodoOneTimePaymentState(
  payment: DodoPaymentLike,
  options: FulfillmentOptions = {},
): Promise<ProductPlanGrantResult> {
  const terminalDispute = latestProviderRecord(
    (payment.disputes ?? []).filter((dispute) => {
      const status = dispute.dispute_status?.toLowerCase()
      return status === "dispute_accepted" || status === "dispute_lost"
    }),
  )
  if (terminalDispute) {
    return revokeDodoOneTimePaymentForDispute(payment, terminalDispute, options)
  }

  if (payment.refund_status === "full") {
    const succeededRefund = latestProviderRecord(
      (payment.refunds ?? []).filter(
        (refund) => refund.status?.toLowerCase() === "succeeded",
      ),
    )
    if (succeededRefund) {
      return refundDodoOneTimePayment(payment, succeededRefund, options)
    }
  }

  return fulfillDodoOneTimePayment(payment, options)
}
