"use client"

import Link from "next/link"
import { ArrowRight, Anchor, Users2, Rocket, ThumbsUp } from "lucide-react"

import { Button } from "@/components/atoms/button"
import { cn } from "@/lib/utils"
import { BROWSE_PATH, MEMBER_PRODUCTS_PATH } from "@/lib/routes"

type JoinCrewCTAStats = {
  totalProducts?: number
  totalCreators?: number
  totalUpvotes?: number
}

interface JoinCrewCTAProps {
  stats?: JoinCrewCTAStats
  className?: string
}

const statConfig = [
  {
    key: "totalProducts" as const,
    label: "Launches listed",
    icon: Rocket,
  },
  {
    key: "totalCreators" as const,
    label: "Builders on board",
    icon: Users2,
  },
  {
    key: "totalUpvotes" as const,
    label: "Upvotes cast",
    icon: ThumbsUp,
  },
]

const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
})

export function JoinCrewCTA({ stats, className }: JoinCrewCTAProps) {
  const resolvedStats = statConfig
    .map((entry) => {
      const value = stats?.[entry.key]
      return {
        ...entry,
        value: typeof value === "number" ? value : null,
      }
    })
    .filter((entry) => entry.value !== null)

  return (
    <section className={cn("relative py-16", className)}>
      <div className="relative mx-auto max-w-[84rem] px-4 md:px-8">
        <section className="relative overflow-hidden rounded-3xl border border-border bg-white px-6 py-8 shadow-sm md:px-10 md:py-10">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-xl space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-muted/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                Join the crew
              </span>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                  Ship your product or scout your next favorite build
                </h2>
                <p className="text-sm text-muted-foreground md:text-base">
                  Launch alongside makers building momentum in the Shipyard
                  directory or stay in discovery mode with curated leaderboards
                  and fresh drops.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href={MEMBER_PRODUCTS_PATH}>
                    <Anchor className="mr-2 h-4 w-4" /> Submit a launch
                  </Link>
                </Button>
                <Link
                  href={BROWSE_PATH}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[--ring] sm:w-auto"
                >
                  Explore products
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </div>

            {resolvedStats.length ? (
              <dl className="grid w-full gap-4 rounded-2xl border border-border/60 bg-muted/20 p-4 sm:grid-cols-3 md:w-auto md:grid-cols-1 md:gap-5 md:p-5">
                {resolvedStats.map(({ key, label, icon: Icon, value }) => (
                  <div key={key} className="space-y-1">
                    <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.26em] text-muted-foreground">
                      <Icon
                        className="h-3.5 w-3.5 text-muted-foreground/80"
                        aria-hidden
                      />
                      {label}
                    </dt>
                    <dd className="text-2xl font-semibold text-foreground">
                      {compactNumberFormatter.format(value ?? 0)}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  )
}

export default JoinCrewCTA
