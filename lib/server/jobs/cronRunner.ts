import { GET as runAnalyticsProductInterestRoute } from "@/app/api/cron/analytics/product-interest/route"
import { GET as runAnalyticsSyncRoute } from "@/app/api/cron/analytics/sync/route"
import { GET as runBadgesTrendingRoute } from "@/app/api/cron/badges/trending/route"
import { GET as runDodoDiscountsCleanupRoute } from "@/app/api/cron/dodo/discounts/cleanup/route"
import { GET as runExpirePlansRoute } from "@/app/api/cron/expire-plans/route"
import { GET as runFounderVisibilityRoute } from "@/app/api/cron/founder-visibility/route"
import { GET as runLeaderboardHighlightsRoute } from "@/app/api/cron/leaderboard-highlights/route"
import { GET as runLeaderboardRefreshRoute } from "@/app/api/cron/leaderboard-refresh/route"
import { GET as runMicroLeaderboardsMidweekRoute } from "@/app/api/cron/micro-leaderboards/midweek/route"
import { GET as runMonthlyLeaderboardRoute } from "@/app/api/cron/monthly-leaderboard/route"
import { GET as runPromotionsFeaturedRoute } from "@/app/api/cron/promotions/featured/route"
import { GET as runRewardsBacklinksRoute } from "@/app/api/cron/rewards/backlinks/route"
import { GET as runRewardsPlacementsRoute } from "@/app/api/cron/rewards/placements/route"
import { GET as runRewardsStreakRoute } from "@/app/api/cron/rewards/streak/route"
import { GET as runWeeklyNewsletterRoute } from "@/app/api/cron/weekly-newsletter/route"
import {
  getScheduledJobDefinition,
  type ScheduledJobName,
} from "@/lib/server/jobs/scheduled"

type CronRouteHandler = (request: Request) => Response | Promise<Response>

export type ScheduledJobRunResult = {
  jobName: ScheduledJobName
  path: string
  status: number
  body: unknown
}

const CRON_ROUTE_HANDLERS: Record<ScheduledJobName, CronRouteHandler> = {
  "analytics-product-interest": runAnalyticsProductInterestRoute,
  "analytics-sync": runAnalyticsSyncRoute,
  "badges-trending": runBadgesTrendingRoute,
  "dodo-discounts-cleanup": runDodoDiscountsCleanupRoute,
  "expire-plans": runExpirePlansRoute,
  "founder-visibility-owner": runFounderVisibilityRoute,
  "leaderboard-highlights-day": runLeaderboardHighlightsRoute,
  "leaderboard-highlights-week": runLeaderboardHighlightsRoute,
  "leaderboard-refresh": runLeaderboardRefreshRoute,
  "micro-leaderboards-midweek": runMicroLeaderboardsMidweekRoute,
  "monthly-leaderboard": runMonthlyLeaderboardRoute,
  "promotions-featured": runPromotionsFeaturedRoute,
  "rewards-backlinks": runRewardsBacklinksRoute,
  "rewards-placements": runRewardsPlacementsRoute,
  "rewards-streak": runRewardsStreakRoute,
  "weekly-newsletter": runWeeklyNewsletterRoute,
}

export async function runScheduledCronJob(
  jobName: ScheduledJobName,
): Promise<ScheduledJobRunResult> {
  const definition = getScheduledJobDefinition(jobName)
  const handler = CRON_ROUTE_HANDLERS[jobName]
  if (!handler) {
    throw new Error(
      `No route handler registered for scheduled job "${jobName}"`,
    )
  }

  const request = buildCronRequest(definition.path)
  const response = await handler(request)
  const body = await readResponseBody(response)

  if (!response.ok) {
    throw new Error(
      `Scheduled job "${jobName}" failed with HTTP ${response.status}: ${formatFailureBody(body)}`,
    )
  }

  return {
    jobName,
    path: definition.path,
    status: response.status,
    body,
  }
}

function buildCronRequest(path: string): Request {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    throw new Error("CRON_SECRET must be set before running scheduled jobs")
  }

  const baseUrl =
    process.env.SHIPYARD_INTERNAL_BASE_URL?.trim() || "http://shipyardhq.local"
  const url = new URL(path, baseUrl)

  return new Request(url, {
    headers: {
      authorization: `Bearer ${secret}`,
    },
  })
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function formatFailureBody(body: unknown): string {
  if (body && typeof body === "object" && "error" in body) {
    return String((body as { error: unknown }).error)
  }
  if (typeof body === "string") return body
  return JSON.stringify(body)
}
