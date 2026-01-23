import type {
  ProductInterestBadgeSpec,
  ProductInterestSignals,
} from "@/types/product-interest"

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
    includeBuildersClicked?: boolean
    minBuildersClicked?: number
  },
): ProductInterestBadgeSpec[] {
  if (!interest) return []

  const maxBadges =
    typeof options?.maxBadges === "number" && options.maxBadges > 0
      ? Math.floor(options.maxBadges)
      : 2

  const clicks7d = Math.max(0, Math.round(safeNumber(interest.clicks7d)))
  const uniqueVisitors7d = Math.max(
    0,
    Math.round(safeNumber(interest.uniqueVisitors7d)),
  )
  const repeatVisits7d = Math.max(
    0,
    Math.round(safeNumber(interest.repeatVisits7d)),
  )
  const clickVelocityWoW = safeNumber(interest.clickVelocityWoW)

  const specs: ProductInterestBadgeSpec[] = []

  const risingFast =
    clicks7d >= 12 && clickVelocityWoW >= 0.4 && uniqueVisitors7d >= 8
  const trendingThisWeek =
    clicks7d >= 60 ||
    uniqueVisitors7d >= 45 ||
    (clicks7d >= 25 && clickVelocityWoW >= 0.2)
  const consistentlyDiscovered =
    uniqueVisitors7d >= 10 &&
    repeatVisits7d >= 5 &&
    repeatVisits7d / Math.max(uniqueVisitors7d, 1) >= 0.25

  if (risingFast) {
    specs.push({
      key: "rising-fast",
      label: "Rising fast",
      variant: "success",
      title: "Click velocity is up week over week",
    })
  }

  if (specs.length < maxBadges && trendingThisWeek) {
    specs.push({
      key: "trending-this-week",
      label: "Trending this week",
      variant: "default",
      title: "High interest this week",
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

  const minBuildersClicked =
    typeof options?.minBuildersClicked === "number"
      ? Math.max(0, Math.floor(options.minBuildersClicked))
      : 3

  if (
    specs.length < maxBadges &&
    options?.includeBuildersClicked !== false &&
    uniqueVisitors7d >= minBuildersClicked
  ) {
    const builderNoun = uniqueVisitors7d === 1 ? "builder" : "builders"
    specs.push({
      key: "builders-clicked",
      label: `${formatCompactCount(uniqueVisitors7d)} ${builderNoun} clicked`,
      variant: "secondary",
      title: "Unique visitors in the last 7 days",
    })
  }

  return specs.slice(0, maxBadges)
}
