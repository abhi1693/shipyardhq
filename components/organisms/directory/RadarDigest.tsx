import Link from "next/link"

import type { TrendRadarCategoryMetrics } from "@/lib/trend-radar"
import { categoryPath } from "@/lib/routes"

interface DirectoryRadarDigestProps {
  metrics: TrendRadarCategoryMetrics[]
  totals: {
    products: number
    trendingProducts: number
    upvotes: number
  }
}

const numberFormatter = new Intl.NumberFormat("en-US")

export function DirectoryRadarDigest({
  metrics,
  totals,
}: DirectoryRadarDigestProps) {
  if (!metrics.length) {
    return null
  }

  const momentumLeaders = [...metrics]
    .sort((a, b) => b.normalizedMomentum - a.normalizedMomentum)
    .slice(0, 5)

  return (
    <section className="rounded-3xl border border-border/60 bg-background/80 p-6 shadow-sm shadow-black/5">
      <div className="mb-6 space-y-2">
        <h3 className="text-lg font-semibold text-foreground">
          Radar: momentum signals
        </h3>
        <p className="text-sm text-muted-foreground">
          Snapshot of categories earning the most traction right now. Each score
          blends fresh launches, catalog depth, and upvote velocity.
        </p>
      </div>
      <ul className="space-y-4">
        {momentumLeaders.map((metric) => (
          <li key={metric.id} className="rounded-2xl border border-transparent px-3 py-2 transition-colors hover:border-border/70 hover:bg-muted/60">
            <Link href={categoryPath(metric.slug)} className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {metric.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {numberFormatter.format(metric.trendingCount)} launches trending ·
                  {" "}
                  {numberFormatter.format(metric.trendingUpvotes)} upvotes in motion
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Momentum
                </p>
                <p className="text-xl font-semibold text-primary">
                  {metric.normalizedMomentum}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs">
        <div className="rounded-2xl bg-muted/50 px-3 py-2">
          <p className="font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Catalog
          </p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {numberFormatter.format(totals.products)}
          </p>
        </div>
        <div className="rounded-2xl bg-muted/50 px-3 py-2">
          <p className="font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Trending
          </p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {numberFormatter.format(totals.trendingProducts)}
          </p>
        </div>
        <div className="rounded-2xl bg-muted/50 px-3 py-2">
          <p className="font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Upvotes
          </p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {numberFormatter.format(totals.upvotes)}
          </p>
        </div>
      </div>
    </section>
  )
}

export default DirectoryRadarDigest
