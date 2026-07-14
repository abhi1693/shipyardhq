import type {
  ProductInterestBadgeSpec,
  ProductInterestSignals,
} from "@/types/product-interest"
import { ANALYTICS_REPORTING_WINDOW_LABEL } from "@/lib/analytics/reportingWindow"

const DEFAULT_BADGE_COUNT_FORMAT = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 0,
})

function safeNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatCompactCount(value: number) {
  const normalized = Math.max(0, Math.round(safeNumber(value)))
  return DEFAULT_BADGE_COUNT_FORMAT.format(normalized)
}

export function buildProductInterestBadges(
  interest: ProductInterestSignals | null | undefined,
  options?: {
    maxBadges?: number
    includeVisitCount?: boolean
    minVisitCount?: number
  },
): ProductInterestBadgeSpec[] {
  if (!interest) return []

  const maxBadges =
    typeof options?.maxBadges === "number" && options.maxBadges > 0
      ? Math.floor(options.maxBadges)
      : 2

  const pageViews = Math.max(0, Math.round(safeNumber(interest.pageViews)))
  const visitors = Math.max(0, Math.round(safeNumber(interest.visitors)))
  const repeatVisits = Math.max(
    0,
    Math.round(safeNumber(interest.repeatVisits)),
  )
  const pageViewChangeRatio = safeNumber(interest.pageViewChangeRatio)

  const specs: ProductInterestBadgeSpec[] = []

  const risingFast =
    pageViews >= 12 && pageViewChangeRatio >= 0.4 && visitors >= 8
  const trending =
    pageViews >= 60 ||
    visitors >= 45 ||
    (pageViews >= 25 && pageViewChangeRatio >= 0.2)
  const consistentlyDiscovered =
    visitors >= 10 &&
    repeatVisits >= 5 &&
    repeatVisits / Math.max(visitors, 1) >= 0.25

  if (risingFast) {
    specs.push({
      key: "rising-fast",
      label: "Rising fast",
      variant: "success",
      title: "Page views are up versus the previous reporting window",
    })
  }

  if (specs.length < maxBadges && trending) {
    specs.push({
      key: "trending",
      label: "Trending now",
      variant: "default",
      title: `High interest in the ${ANALYTICS_REPORTING_WINDOW_LABEL.toLowerCase()}`,
    })
  }

  if (specs.length < maxBadges && consistentlyDiscovered) {
    specs.push({
      key: "consistently-discovered",
      label: "Consistently discovered",
      variant: "outline",
      title: "Repeat visits show ongoing discovery",
    })
  }

  const minVisitCount =
    typeof options?.minVisitCount === "number"
      ? Math.max(0, Math.floor(options.minVisitCount))
      : 3

  if (
    specs.length < maxBadges &&
    options?.includeVisitCount !== false &&
    visitors >= minVisitCount
  ) {
    const visitNoun = visitors === 1 ? "visit" : "visits"
    specs.push({
      key: "visit-count",
      label: `${formatCompactCount(visitors)} ${visitNoun}`,
      variant: "secondary",
      title: `Visits in the ${ANALYTICS_REPORTING_WINDOW_LABEL.toLowerCase()}`,
    })
  }

  return specs.slice(0, maxBadges)
}
