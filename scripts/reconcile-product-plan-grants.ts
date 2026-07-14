import { dodoClient } from "@/lib/dodo"
import prisma from "@/lib/prisma"
import {
  reconcileDodoOneTimePaymentState,
  syncDodoSubscriptionGrant,
  type ProductPlanGrantResult,
  UNVERIFIED_SUBSCRIPTION_PLAN_CHANGE_REASON,
} from "@/lib/server/productPlanGrants"
import {
  PlanType,
  ProductPlanGrantSource,
  ProductPlanGrantStatus,
} from "@/lib/vendor/prisma/client"
import { refreshProductPlanGrantCachesFromWorker } from "@/lib/server/productPlanGrantCache"
import { hasVerifiedDodoSubscriptionPlanChangePayment } from "@/lib/server/dodoSubscriptionPayments"
import { readMetadataString } from "@/lib/server/subscriptionMetadata"

if (!process.argv.includes("--apply")) {
  console.error(
    "Refusing to reconcile without --apply. Run: npm run billing:reconcile-product-grants -- --apply",
  )
  process.exit(2)
}

type OutcomeCounts = Record<ProductPlanGrantResult["outcome"], number>

const outcomeCounts: OutcomeCounts = {
  applied: 0,
  recorded: 0,
  duplicate: 0,
  ignored: 0,
  invalid: 0,
}
let failures = 0
const touchedProductIds = new Set<string>()
const changedProductIds = new Set<string>()

function recordResult(
  result: ProductPlanGrantResult,
  context: { paymentId?: string; subscriptionId?: string },
) {
  outcomeCounts[result.outcome] += 1
  if (
    result.outcome === "invalid" ||
    result.reason === UNVERIFIED_SUBSCRIPTION_PLAN_CHANGE_REASON
  ) {
    failures += 1
    console.error("[plan-grant-reconcile] invalid provider record", {
      ...context,
      productId: result.productId,
      reason: result.reason,
    })
  }
  if (
    result.productId &&
    result.outcome !== "ignored" &&
    result.outcome !== "invalid"
  ) {
    touchedProductIds.add(result.productId)
  }
  if (result.productId && (result.grantChanged || result.projectionChanged)) {
    changedProductIds.add(result.productId)
  }
}

function metadataRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

const reconciliationStartedAt = new Date()
const MS_PER_DAY = 24 * 60 * 60 * 1000
const migrationCandidates = await prisma.productPlanGrant.findMany({
  where: {
    source: ProductPlanGrantSource.migration,
    status: ProductPlanGrantStatus.revoked,
    startsAt: { lte: reconciliationStartedAt },
    plan: { price: { gt: 0 } },
    OR: [
      {
        plan: { type: PlanType.one_time_price },
        expiresAt: { gt: reconciliationStartedAt },
      },
      {
        plan: { type: PlanType.recurring_price },
        externalSubscriptionId: { not: null },
      },
    ],
  },
  select: {
    productId: true,
    planId: true,
    externalSubscriptionId: true,
    plan: { select: { type: true } },
  },
})
const existingDodoSubscriptions = await prisma.productPlanGrant.findMany({
  where: {
    source: ProductPlanGrantSource.dodo_subscription,
    externalSubscriptionId: { not: null },
  },
  select: { externalSubscriptionId: true },
})
const knownSubscriptionIds = new Set([
  ...migrationCandidates.flatMap((candidate) =>
    candidate.externalSubscriptionId ? [candidate.externalSubscriptionId] : [],
  ),
  ...existingDodoSubscriptions.flatMap((grant) =>
    grant.externalSubscriptionId ? [grant.externalSubscriptionId] : [],
  ),
])
const [longestOneTimePlan, activeDodoPaymentGrants] = await Promise.all([
  prisma.plan.aggregate({
    where: {
      isDefault: false,
      type: PlanType.one_time_price,
      price: { gt: 0 },
    },
    _max: { boostForDays: true },
  }),
  prisma.productPlanGrant.findMany({
    where: {
      source: ProductPlanGrantSource.dodo_payment,
      status: ProductPlanGrantStatus.active,
      externalPaymentId: { not: null },
    },
    select: { externalPaymentId: true },
  }),
])
const oneTimeLookbackDays = Math.max(
  7,
  (longestOneTimePlan._max.boostForDays ?? 0) + 2,
)
const oneTimeCutoff = new Date(
  reconciliationStartedAt.getTime() - oneTimeLookbackDays * MS_PER_DAY,
)
const paymentIds = new Set(
  activeDodoPaymentGrants.flatMap((grant) =>
    grant.externalPaymentId ? [grant.externalPaymentId] : [],
  ),
)

for await (const payment of dodoClient.payments.list({
  status: "succeeded",
  created_at_gte: oneTimeCutoff.toISOString(),
  page_size: 100,
})) {
  if (payment.subscription_id) continue
  const metadata = metadataRecord(payment.metadata)
  if (
    !readMetadataString(metadata, "productId", "product_id") ||
    !readMetadataString(metadata, "planId", "plan_id")
  ) {
    continue
  }
  paymentIds.add(payment.payment_id)
}

for (const paymentId of paymentIds) {
  try {
    const fullPayment = await dodoClient.payments.retrieve(paymentId)
    recordResult(
      await reconcileDodoOneTimePaymentState(fullPayment, {
        now: reconciliationStartedAt,
      }),
      { paymentId },
    )
  } catch (error) {
    failures += 1
    console.error("[plan-grant-reconcile] payment failed", {
      paymentId,
      error,
    })
  }
}

for await (const listedSubscription of dodoClient.subscriptions.list({
  page_size: 100,
})) {
  const metadata = metadataRecord(listedSubscription.metadata)
  const listedAsActive =
    listedSubscription.status?.toString().toLowerCase() === "active"
  const hasProductPlanMetadata = Boolean(
    readMetadataString(metadata, "productId", "product_id") &&
    readMetadataString(metadata, "planId", "plan_id"),
  )
  if (
    !knownSubscriptionIds.has(listedSubscription.subscription_id) &&
    !(listedAsActive && hasProductPlanMetadata)
  ) {
    continue
  }
  try {
    const subscription = await dodoClient.subscriptions.retrieve(
      listedSubscription.subscription_id,
    )
    const providerObservedAt = new Date()
    const planChangePaymentSucceeded =
      await hasVerifiedDodoSubscriptionPlanChangePayment({
        subscriptionId: subscription.subscription_id,
        productId: subscription.product_id,
        status: subscription.status,
        metadata: subscription.metadata,
      })
    recordResult(
      await syncDodoSubscriptionGrant(subscription, {
        now: reconciliationStartedAt,
        providerObservedAt,
        planChangePaymentSucceeded,
      }),
      { subscriptionId: subscription.subscription_id },
    )
  } catch (error) {
    failures += 1
    console.error("[plan-grant-reconcile] subscription failed", {
      subscriptionId: listedSubscription.subscription_id,
      error,
    })
  }
}

const candidateProductIds = Array.from(
  new Set(migrationCandidates.map((candidate) => candidate.productId)),
)
const verifiedGrants = candidateProductIds.length
  ? await prisma.productPlanGrant.findMany({
      where: {
        productId: { in: candidateProductIds },
        source: {
          in: [
            ProductPlanGrantSource.dodo_payment,
            ProductPlanGrantSource.dodo_subscription,
          ],
        },
        status: ProductPlanGrantStatus.active,
        startsAt: { lte: reconciliationStartedAt },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: reconciliationStartedAt } },
        ],
      },
      select: {
        productId: true,
        planId: true,
        source: true,
        externalSubscriptionId: true,
      },
    })
  : []

const verifiedByProduct = new Map<string, typeof verifiedGrants>()
for (const grant of verifiedGrants) {
  const grants = verifiedByProduct.get(grant.productId) ?? []
  grants.push(grant)
  verifiedByProduct.set(grant.productId, grants)
}

const missingCandidates = migrationCandidates.filter((candidate) => {
  const verified = verifiedByProduct.get(candidate.productId) ?? []
  return candidate.plan.type === PlanType.recurring_price
    ? verified.every(
        (grant) =>
          grant.source !== ProductPlanGrantSource.dodo_subscription ||
          grant.externalSubscriptionId !== candidate.externalSubscriptionId,
      )
    : verified.every(
        (grant) =>
          grant.source !== ProductPlanGrantSource.dodo_payment ||
          grant.planId !== candidate.planId,
      )
})

if (touchedProductIds.size) {
  try {
    await refreshProductPlanGrantCachesFromWorker(
      [...touchedProductIds],
      "billing.provider-reconciliation",
    )
  } catch (error) {
    failures += 1
    console.error("[plan-grant-reconcile] cache refresh failed", { error })
  }
}

console.info("[plan-grant-reconcile] complete", {
  startedAt: reconciliationStartedAt.toISOString(),
  oneTimeLookbackDays,
  outcomes: outcomeCounts,
  failures,
  touchedProducts: touchedProductIds.size,
  changedProducts: changedProductIds.size,
  migrationCandidates: migrationCandidates.length,
  verifiedCandidates: migrationCandidates.length - missingCandidates.length,
  missingCandidates: missingCandidates.map((candidate) => ({
    productId: candidate.productId,
    planId: candidate.planId,
    externalSubscriptionId: candidate.externalSubscriptionId,
    planType: candidate.plan.type,
  })),
})

if (failures > 0 || missingCandidates.length > 0) {
  process.exitCode = 1
}
