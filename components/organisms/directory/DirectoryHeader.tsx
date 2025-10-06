import Link from "next/link"

import { Button } from "@/components/atoms/button"
import { cn } from "@/lib/utils"
import { BROWSE_PATH } from "@/lib/routes"

interface DirectoryHeaderProps {
  stats: {
    totalProducts: number
    totalCreators: number
    totalUpvotes: number
    topScore: number
    totalInsights: number
  }
}

const metrics = [
  {
    key: "totalProducts",
    label: "Launched products",
    formatter: (value: number) => value.toLocaleString(),
  },
  {
    key: "totalCreators",
    label: "Makers onboard",
    formatter: (value: number) => value.toLocaleString(),
  },
  {
    key: "totalUpvotes",
    label: "Community upvotes",
    formatter: (value: number) => value.toLocaleString(),
  },
  {
    key: "topScore",
    label: "Today’s leader",
    formatter: (value: number) => `#${Math.max(value, 0).toLocaleString()}`,
  },
] as const

export function DirectoryHeader({ stats }: DirectoryHeaderProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-background/90 px-6 py-12 shadow-lg shadow-black/5 backdrop-blur md:px-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(110%_90%_at_0%_0%,var(--brand-1)/0.12,transparent_60%),radial-gradient(110%_90%_at_100%_20%,var(--brand-2)/0.12,transparent_65%)]"
      />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-5">
          <span className="inline-flex items-center gap-2 rounded-full bg-muted/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.26em] text-muted-foreground">
            Shipyard Directory
          </span>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Discover launches making waves today
            </h1>
            <p className="max-w-xl text-base text-muted-foreground">
              Shipyard surfaces every product launch in a single directory. Start
              with the homepage spotlight, explore featured placements, then dig
              into editor picks, new arrivals, and the trends powering the
              leaderboard.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href={BROWSE_PATH}>Browse the full directory</Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="hover:bg-muted/70">
              <Link href={`${BROWSE_PATH}?sort=latest`}>Jump to latest launches</Link>
            </Button>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-5 text-sm sm:grid-cols-4 lg:grid-cols-2">
          {metrics.map((metric) => {
            const rawValue = stats[metric.key]
            return (
              <div
                key={metric.key}
                className={cn(
                  "rounded-2xl border border-border/80 bg-background/80 p-5 shadow-[0_20px_45px_-34px_rgba(7,58,104,0.7)]",
                )}
              >
                <dt className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
                  {metric.label}
                </dt>
                <dd className="mt-3 text-2xl font-semibold text-foreground">
                  {metric.formatter(rawValue)}
                </dd>
              </div>
            )
          })}
        </dl>
      </div>
    </section>
  )
}

export default DirectoryHeader
