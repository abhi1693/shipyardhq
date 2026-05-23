import { revalidateMonthlyLeaderboard } from "@/lib/cache/revalidate"
import prisma from "@/lib/prisma"
import { refreshProductInterestCache } from "@/lib/server/analytics/productInterest"
import {
  runAnalyticsIngestion,
  type IngestionJobKey,
} from "@/lib/server/analytics/ingestion"
import { cleanupExpiredUnusedDodoDiscounts } from "@/lib/server/dodoDiscountCleanup"
import { sendWeeklyNewsletterEmails } from "@/lib/server/email/weeklyNewsletter"
import { runFounderVisibilityEngagement } from "@/lib/server/engagement/founderVisibility"
import { runMicroLeaderboardEngagement } from "@/lib/server/engagement/microLeaderboards"
import { dispatchEvent } from "@/lib/server/events"
import { APP_EVENTS } from "@/lib/server/events/constants"
import {
  getPreviousMonth,
  normalizeMonth,
  toMonthKey,
} from "@/lib/server/leaderboard/months"
import {
  computeLeaderboardWindow,
  generateLeaderboardRun,
} from "@/lib/server/leaderboard/v2"
import {
  announceLeaderboardPeriodWinners,
  announceLeaderboardWinnersForRun,
  type PeriodCadence,
} from "@/lib/server/leaderboard/winners"
import { expireBoostedPlans } from "@/lib/server/planExpiration"
import { runFeaturedPlanPromoCron } from "@/lib/server/promotions/featuredPlanPromo"
import {
  BACKLINK_CRON_LOG_PREFIX,
  runBacklinkVerification,
} from "@/lib/server/rewards/backlinkVerification"
import { runPlacementScheduler } from "@/lib/server/rewards/placementScheduler"
import { runStreakMaintenance } from "@/lib/server/rewards/streakMaintenance"
import type { ScheduledJobName } from "@/lib/server/jobs/scheduled"

type ScheduledJobHandler = () => Promise<unknown>

export type ScheduledJobRunResult = {
  jobName: ScheduledJobName
  result: unknown
}

const HOUR_MS = 60 * 60 * 1000
const DEFAULT_TRENDING_CURRENT_WINDOW_HOURS = 6
const DEFAULT_TRENDING_PREVIOUS_WINDOW_HOURS = 6
const DEFAULT_TRENDING_MIN_SCORE = 5
const DEFAULT_TRENDING_MIN_RATIO = 1.5
const DEFAULT_TRENDING_LIMIT = 1
const TRENDING_TTL_MS = 12 * HOUR_MS

const ANALYTICS_SYNC_JOBS: IngestionJobKey[] = [
  "product_traffic_daily",
  "product_traffic_breakdowns",
  "site_traffic_daily",
  "site_traffic_breakdowns",
]

const SCHEDULED_JOB_HANDLERS = {
  "analytics-product-interest": runAnalyticsProductInterestJob,
  "analytics-sync": runAnalyticsSyncJob,
  "badges-trending": runBadgesTrendingJob,
  "dodo-discounts-cleanup": runDodoDiscountsCleanupJob,
  "expire-plans": runExpirePlansJob,
  "founder-visibility-owner": runFounderVisibilityOwnerJob,
  "leaderboard-highlights-day": () => runLeaderboardHighlightsJob("day"),
  "leaderboard-highlights-week": () => runLeaderboardHighlightsJob("week"),
  "leaderboard-refresh": runLeaderboardRefreshJob,
  "micro-leaderboards-midweek": runMicroLeaderboardsMidweekJob,
  "monthly-leaderboard": runMonthlyLeaderboardJob,
  "promotions-featured": runPromotionsFeaturedJob,
  "rewards-backlinks": runRewardsBacklinksJob,
  "rewards-placements": runRewardsPlacementsJob,
  "rewards-streak": runRewardsStreakJob,
  "weekly-newsletter": runWeeklyNewsletterJob,
} satisfies Record<ScheduledJobName, ScheduledJobHandler>

export async function runScheduledJob(
  jobName: ScheduledJobName,
): Promise<ScheduledJobRunResult> {
  const handler = SCHEDULED_JOB_HANDLERS[jobName]
  if (!handler) {
    throw new Error(`No handler registered for scheduled job "${jobName}"`)
  }

  const result = await handler()
  return { jobName, result }
}

async function runExpirePlansJob() {
  const result = await expireBoostedPlans()
  const boostCount = result.count ?? 0
  const recurringCount = result.recurringCount ?? 0
  const totalExpired = boostCount + recurringCount

  if (!totalExpired) {
    console.info("[scheduled.expire-plans] noop")
  } else {
    console.info("[scheduled.expire-plans] expired boosts", {
      count: totalExpired,
      boostsExpired: result.expired.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        planName: item.planName,
        boostForDays: item.boostForDays,
      })),
      recurringExpired: (result.recurringExpired || []).map((item) => ({
        productId: item.productId,
        productName: item.productName,
        planName: item.planName,
        status: item.status,
        subscriptionId: item.subscriptionId ?? undefined,
      })),
    })
  }

  return { success: true, ...result }
}

async function runWeeklyNewsletterJob() {
  console.info("[scheduled.weekly-newsletter] run started")
  const result = await sendWeeklyNewsletterEmails()
  console.info("[scheduled.weekly-newsletter] run completed", {
    sent: result.sent,
    skipped: result.skipped,
  })
  return { success: true, ...result }
}

async function runMonthlyLeaderboardJob() {
  const targetMonth = getPreviousMonth(new Date())
  const periodStart = normalizeMonth(targetMonth)
  const periodEnd = new Date(
    Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, 1),
  )

  console.info("[scheduled.monthly-leaderboard] run started", {
    month: targetMonth.toISOString(),
  })
  const result = await generateLeaderboardRun({
    periodStart,
    periodEnd,
    asOf: new Date(),
  })
  const monthKey = toMonthKey(periodStart)
  console.info("[scheduled.monthly-leaderboard] leaderboard generated", {
    monthKey,
    runId: result.runId,
    scores: result.scores,
    windowEnd: result.windowEnd.toISOString(),
  })
  revalidateMonthlyLeaderboard(monthKey, "revalidate")
  const notification = await announceLeaderboardWinnersForRun(result.runId)
  console.info("[scheduled.monthly-leaderboard] winner notification", {
    monthKey,
    notified: notification.notified,
    alreadyNotified: notification.alreadyNotified,
    recipientCount: notification.recipients.length,
    skipped: notification.skipped,
  })

  return { success: true, notification, result }
}

async function runLeaderboardHighlightsJob(period: PeriodCadence) {
  const limit = 3
  const result = await announceLeaderboardPeriodWinners({ period, limit })
  return {
    success: true,
    limit,
    periods: [period],
    results: [{ period, result }],
  }
}

async function runLeaderboardRefreshJob() {
  const now = new Date()
  await dispatchEvent(APP_EVENTS.LEADERBOARD_REFRESH, {
    asOf: now.toISOString(),
  })
  return { success: true, enqueued: true, asOf: now.toISOString() }
}

async function runMicroLeaderboardsMidweekJob() {
  console.info("[scheduled.micro-leaderboards.midweek] run started")
  const result = await runMicroLeaderboardEngagement({
    mode: "midweek",
  })
  console.info("[scheduled.micro-leaderboards.midweek] run completed", {
    weekKey: result.weekKey,
    candidates: result.candidates,
    sent: result.sent,
    skipped: result.skipped,
    reasons: result.reasons,
  })
  return { success: true, ...result }
}

async function runRewardsPlacementsJob() {
  console.info("[scheduled.rewards.placements] run started")
  const result = await runPlacementScheduler()
  const activatedCount = result.activatedProductIds.length
  const expiredCount = result.expiredProductIds.length
  console.info("[scheduled.rewards.placements] run completed", {
    activated: result.activated,
    expired: result.expired,
    badgesActivated: result.badgesActivated,
    badgesExpired: result.badgesExpired,
    activatedProductIds: activatedCount
      ? result.activatedProductIds
      : undefined,
    expiredProductIds: expiredCount ? result.expiredProductIds : undefined,
  })
  return { success: true, ...result }
}

async function runRewardsBacklinksJob() {
  console.info(`${BACKLINK_CRON_LOG_PREFIX} starting verification run`)
  const result = await runBacklinkVerification()
  console.info(`${BACKLINK_CRON_LOG_PREFIX} verification completed`, result)
  return { success: true, ...result }
}

async function runRewardsStreakJob() {
  console.info("[scheduled.rewards.streak] run started")
  const summary = await runStreakMaintenance()
  console.info("[scheduled.rewards.streak] run completed", {
    evaluatedDay: summary.evaluatedDay,
    qualifyingUsers: summary.qualifyingUsers,
    streaksExtended: summary.streaksExtended,
    streaksReset: summary.streaksReset,
    awardsCreated: summary.awardsCreated,
    alreadyEvaluated: summary.alreadyEvaluated,
    failureCount: summary.failures.length,
    tiersAwarded: summary.tiersAwarded,
    triggerRuleTotals: summary.triggerRuleTotals,
  })
  return { success: true, ...summary }
}

async function runBadgesTrendingJob() {
  const now = new Date()
  const currentWindowHours = DEFAULT_TRENDING_CURRENT_WINDOW_HOURS
  const previousWindowHours = DEFAULT_TRENDING_PREVIOUS_WINDOW_HOURS
  const minScore = DEFAULT_TRENDING_MIN_SCORE
  const minRatio = DEFAULT_TRENDING_MIN_RATIO
  const limit = DEFAULT_TRENDING_LIMIT

  const currentStart = new Date(now.getTime() - currentWindowHours * HOUR_MS)
  const previousStart = new Date(
    currentStart.getTime() - previousWindowHours * HOUR_MS,
  )
  const previousEnd = currentStart

  const [currentScores, previousScores] = await Promise.all([
    computeLeaderboardWindow({
      periodStart: currentStart,
      periodEnd: now,
      asOf: now,
      limit,
    }),
    computeLeaderboardWindow({
      periodStart: previousStart,
      periodEnd: previousEnd,
      asOf: previousEnd,
      limit: limit * 2,
    }),
  ])

  const previousMap = new Map<string, number>()
  for (const row of previousScores) {
    previousMap.set(row.productId, row.score)
  }

  const candidates = currentScores.filter((row) => {
    const prev = previousMap.get(row.productId) ?? 0
    const ratio = prev > 0 ? row.score / prev : row.score > 0 ? row.score : 0
    return row.score >= minScore && ratio >= minRatio
  })

  const assigned: Array<{ productId: string; badgeId: string }> = []
  let remaining = limit

  for (const row of candidates) {
    if (remaining <= 0) break

    const product = await prisma.product.findUnique({
      where: { id: row.productId },
      select: { id: true, status: true },
    })
    if (!product || product.status !== "published") continue

    const activeTrending = await prisma.productBadge.findFirst({
      where: {
        productId: product.id,
        badge: "trending",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    })
    if (activeTrending) continue

    const expiresAt = new Date(now.getTime() + TRENDING_TTL_MS)
    const badge = await prisma.productBadge.create({
      data: {
        productId: product.id,
        badge: "trending",
        expiresAt,
      },
    })

    await dispatchEvent(APP_EVENTS.BADGE_ASSIGNED, {
      id: badge.id,
      productId: product.id,
      badge: "trending",
      expiresAt,
    })

    assigned.push({ productId: product.id, badgeId: badge.id })
    remaining -= 1
  }

  return {
    success: true,
    assignedCount: assigned.length,
    candidatesChecked: candidates.length,
    params: {
      currentWindowHours,
      previousWindowHours,
      minScore,
      minRatio,
      limit,
    },
  }
}

async function runAnalyticsProductInterestJob() {
  const days = 7
  const topLimit = 60
  const perCategoryLimit = 60
  const alsoClickedLimit = 12
  const skipAlsoClicked = true

  const result = await refreshProductInterestCache({
    days,
    topLimit,
    perCategoryLimit,
    alsoClickedLimit,
    skipAlsoClicked,
  })

  return {
    days,
    topLimit,
    perCategoryLimit,
    alsoClickedLimit,
    skipAlsoClicked,
    ...result,
  }
}

async function runAnalyticsSyncJob() {
  return runAnalyticsIngestion({
    days: 1,
    jobs: ANALYTICS_SYNC_JOBS,
  })
}

async function runPromotionsFeaturedJob() {
  console.info("[scheduled.promotions.featured] run started")
  const result = await runFeaturedPlanPromoCron()
  console.info("[scheduled.promotions.featured] run completed", {
    success: result.success,
    dryRun: result.dryRun,
    runDay: result.runDay,
    availableSlots: result.slots.available,
    paidFeaturedCustomers: result.slots.paidFeaturedCustomers,
    candidates: result.candidates,
    pendingOffers: result.pendingOffers,
    prepared: result.prepared,
    notified: result.notified,
    skipped: result.skipped,
    reasons: result.reasons,
  })

  if (!result.success) {
    throw new Error(
      `Featured promotion job failed: ${JSON.stringify(result.reasons)}`,
    )
  }

  return result
}

async function runFounderVisibilityOwnerJob() {
  console.info("[scheduled.founder-visibility] run started", {
    audience: "owner",
  })
  const result = await runFounderVisibilityEngagement({
    audience: "owner",
  })
  console.info("[scheduled.founder-visibility] run completed", {
    audience: result.audience,
    weekKey: result.window.weekKey,
    candidates: result.candidates,
    sent: result.sent,
    skipped: result.skipped,
    reasons: result.reasons,
  })
  return { success: true, ...result }
}

async function runDodoDiscountsCleanupJob() {
  console.info("[scheduled.dodo:discounts.cleanup] run started")
  const result = await cleanupExpiredUnusedDodoDiscounts()
  console.info("[scheduled.dodo:discounts.cleanup] run completed", {
    scanned: result.scanned,
    eligible: result.eligible,
    deleted: result.deleted.length,
    failed: result.failed.length,
    dryRun: result.dryRun,
  })

  if (result.failed.length > 0 && !result.dryRun) {
    console.error("[scheduled.dodo:discounts.cleanup] partial failure", {
      failed: result.failed.slice(0, 25),
      failedCount: result.failed.length,
    })
    throw new Error(
      `Dodo discount cleanup failed for ${result.failed.length} discounts`,
    )
  }

  return { success: true, ...result }
}
