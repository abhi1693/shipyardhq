import { refreshHomepageFeedCache } from "@/actions/public/homepage/feed"
import { invalidateHistoricalPeriodicLeaderboardCache } from "@/actions/public/leaderboard/actions"
import { revalidateProduct } from "@/lib/cache/revalidate"
import { invalidateProductAnalyticsRecordCache } from "@/lib/server/analytics/productAnalytics"
import { getAppBaseUrl } from "@/lib/app-url"

export async function refreshProductPlanGrantCaches(
  productId: string,
  reason: string,
) {
  return refreshProductPlanGrantCachesForProducts([productId], reason)
}

export async function refreshProductPlanGrantCachesForProducts(
  productIds: string[],
  reason: string,
) {
  const uniqueProductIds = Array.from(new Set(productIds)).filter(Boolean)
  if (!uniqueProductIds.length) return

  const failures: unknown[] = []

  for (const productId of uniqueProductIds) {
    try {
      revalidateProduct(productId, "revalidate")
    } catch (error) {
      failures.push(error)
      console.error("[plan-grant] Next cache invalidation failed", {
        productId,
        reason,
        error,
      })
    }
  }

  const [homepageResult, leaderboardResult, ...analyticsResults] =
    await Promise.allSettled([
      refreshHomepageFeedCache(),
      invalidateHistoricalPeriodicLeaderboardCache(reason),
      ...uniqueProductIds.map((productId) =>
        invalidateProductAnalyticsRecordCache(productId, reason),
      ),
    ])

  if (homepageResult.status === "rejected") {
    failures.push(homepageResult.reason)
    console.error("[plan-grant] homepage feed refresh failed", {
      productIds: uniqueProductIds,
      reason,
      error: homepageResult.reason,
    })
  }
  if (leaderboardResult.status === "rejected") {
    failures.push(leaderboardResult.reason)
    console.error("[plan-grant] leaderboard cache invalidation failed", {
      productIds: uniqueProductIds,
      reason,
      error: leaderboardResult.reason,
    })
  }
  analyticsResults.forEach((analyticsResult, index) => {
    if (analyticsResult.status === "rejected") {
      failures.push(analyticsResult.reason)
      console.error("[plan-grant] analytics cache invalidation failed", {
        productId: uniqueProductIds[index],
        reason,
        error: analyticsResult.reason,
      })
    }
  })

  if (failures.length) {
    throw new AggregateError(
      failures,
      `${failures.length} product plan grant cache refresh operation(s) failed`,
    )
  }
}

export async function refreshProductPlanGrantCachesFromWorker(
  productIds: string[],
  reason: string,
) {
  const uniqueProductIds = Array.from(new Set(productIds)).filter(Boolean)
  if (!uniqueProductIds.length) return

  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    console.warn("[plan-grant] worker cache endpoint secret missing", {
      reason,
    })
    return refreshProductPlanGrantCachesForProducts(uniqueProductIds, reason)
  }

  const response = await fetch(
    new URL("/api/billing/plan-grants/refresh", getAppBaseUrl()),
    {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${secret}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ productIds: uniqueProductIds, reason }),
    },
  )
  if (!response.ok) {
    throw new Error(
      `[plan-grant] worker cache refresh failed: ${response.status} ${response.statusText}`,
    )
  }
}
