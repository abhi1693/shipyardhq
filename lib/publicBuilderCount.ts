import { siteGrowthMetrics } from "@/lib/siteConfig"

const numberFormatter = new Intl.NumberFormat("en-US")

export function resolvePublicBuilderCount(databaseBuilderCount: number) {
  const safeDatabaseBuilderCount = Number.isFinite(databaseBuilderCount)
    ? Math.max(0, Math.floor(databaseBuilderCount))
    : 0

  return Math.max(safeDatabaseBuilderCount, siteGrowthMetrics.builderCount)
}

export function formatPublicBuilderCountMessage(databaseBuilderCount: number) {
  const builderCount = resolvePublicBuilderCount(databaseBuilderCount)
  const roundedBuilderCount = Math.floor(builderCount / 100) * 100
  const builderCountLabel =
    builderCount < 1000
      ? numberFormatter.format(builderCount)
      : `${numberFormatter.format(roundedBuilderCount)}+`
  const builderNoun = builderCount === 1 ? "builder" : "builders"

  return `Join ${builderCountLabel} ${builderNoun} launching in public`
}
