import prisma from "@/lib/prisma"
import { INSIGHTS_PIPELINE_FEATURE_KEY } from "@/lib/constants"
import {
  computeInsightsCooldownMs,
  parseInsightsUsageConfig,
  type InsightsUsagePolicy,
} from "@/lib/productInsights/insightsUsage"

function selectMostPermissivePolicy(
  policies: InsightsUsagePolicy[],
): InsightsUsagePolicy | null {
  if (!policies.length) return null

  if (
    policies.some(
      (policy) => policy.usageLimit === null || policy.usageInterval === null,
    )
  ) {
    return { usageLimit: null, usageInterval: null }
  }

  let best: { policy: InsightsUsagePolicy; cooldown: number } | null = null

  for (const policy of policies) {
    const cooldown = computeInsightsCooldownMs(policy)
    if (cooldown === null) {
      return { usageLimit: null, usageInterval: null }
    }
    if (!best || cooldown < best.cooldown) {
      best = { policy, cooldown }
    }
  }

  return best?.policy ?? null
}

export type InsightsPipelinePolicy = InsightsUsagePolicy

export type InsightsPipelineAccessResult =
  | { ok: true; policy: InsightsPipelinePolicy | null }
  | {
      ok: false
      reason: "missing_feature" | "limit_reached"
      policy: InsightsPipelinePolicy | null
      nextAllowedAt?: Date
    }

export async function evaluateInsightsPipelineAccess(params: {
  productId: string
  userId: string
  lastRunAt: Date | null
}): Promise<InsightsPipelineAccessResult> {
  const { productId, userId, lastRunAt } = params

  const [productPlan, userPurchases] = await Promise.all([
    prisma.product.findUnique({
      where: { id: productId },
      select: {
        plan: {
          select: {
            slug: true,
            assignments: {
              where: {
                enabled: true,
                feature: { key: INSIGHTS_PIPELINE_FEATURE_KEY },
              },
              select: { config: true },
            },
          },
        },
      },
    }),
    prisma.userPlanPurchase.findMany({
      where: { userId },
      select: {
        plan: {
          select: {
            slug: true,
            assignments: {
              where: {
                enabled: true,
                feature: { key: INSIGHTS_PIPELINE_FEATURE_KEY },
              },
              select: { config: true },
            },
          },
        },
      },
    }),
  ])

  const policies: InsightsUsagePolicy[] = []

  if (productPlan?.plan?.assignments?.length) {
    for (const assignment of productPlan.plan.assignments) {
      policies.push(parseInsightsUsageConfig(assignment.config))
    }
  }

  if (userPurchases.length) {
    for (const purchase of userPurchases) {
      const plan = purchase.plan
      if (!plan?.assignments?.length) continue
      for (const assignment of plan.assignments) {
        policies.push(parseInsightsUsageConfig(assignment.config))
      }
    }
  }

  const effectivePolicy = selectMostPermissivePolicy(policies)

  if (!effectivePolicy) {
    return { ok: false, reason: "missing_feature", policy: null }
  }

  if (
    effectivePolicy.usageLimit === null ||
    effectivePolicy.usageInterval === null
  ) {
    return { ok: true, policy: { usageLimit: null, usageInterval: null } }
  }

  const cooldown = computeInsightsCooldownMs(effectivePolicy)
  if (!cooldown) {
    return { ok: true, policy: { usageLimit: null, usageInterval: null } }
  }

  if (!lastRunAt) {
    return { ok: true, policy: effectivePolicy }
  }

  const nextAllowedAt = new Date(lastRunAt.getTime() + cooldown)
  if (Date.now() < nextAllowedAt.getTime()) {
    return {
      ok: false,
      reason: "limit_reached",
      policy: effectivePolicy,
      nextAllowedAt,
    }
  }

  return { ok: true, policy: effectivePolicy }
}
