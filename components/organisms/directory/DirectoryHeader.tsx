import Link from "next/link"
import { Play, Rocket } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import { StickyBannerRegion } from "@/components/layout/sticky-banner-context"
import {
  BROWSE_PATH,
  MEMBER_PRODUCTS_PATH,
} from "@/lib/routes"

type HeaderActionConfig = {
  label: string
  href: string
  variant?: "default" | "outline" | "ghost" | "secondary"
  className?: string
}

type StatsShape = {
  totalProducts: number
  totalCreators: number
  totalUpvotes: number
  topScore: number
  totalInsights: number
}

type MetricConfig = {
  key: keyof StatsShape
  label: string
  formatter?: (value: number) => string
}

interface DirectoryHeaderProps {
  stats: StatsShape
  eyebrow?: string
  title?: string
  description?: string
  primaryAction?: HeaderActionConfig | null
  secondaryAction?: HeaderActionConfig | null
  metrics?: readonly MetricConfig[]
  aside?: ReactNode
}

const HERO_PRIMARY_CLASSES =
  "inline-flex h-11 min-w-[11rem] items-center justify-center gap-2 rounded-full bg-[color:var(--brand-1)] px-6 text-sm font-semibold text-white shadow-[0_18px_36px_-24px_rgba(15,23,42,0.35)] transition hover:bg-[color:var(--brand-1)]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-1)]/25 focus-visible:ring-offset-2 focus-visible:ring-offset-white"

const HERO_SECONDARY_CLASSES =
  "inline-flex h-11 min-w-[11rem] items-center justify-center gap-2 rounded-full border border-border/70 bg-white px-6 text-sm font-semibold text-foreground shadow-[0_14px_34px_-28px_rgba(15,23,42,0.28)] transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-1)]/15 focus-visible:ring-offset-2 focus-visible:ring-offset-white"

export function DirectoryHeader({
  stats,
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  metrics = [],
  aside,
}: DirectoryHeaderProps) {
  const resolvedEyebrow = eyebrow ?? "Launch today · Claim your backlink"
  const resolvedTitle = title ?? "Shipyard homepage"
  const resolvedDescription =
    description ??
    "Shipyard helps indie founders earn lasting discovery with free SEO backlinks, homepage spotlights, and supportive feedback loops."

  const defaultPrimary: HeaderActionConfig = {
    label: "Submit your product",
    href: MEMBER_PRODUCTS_PATH,
  }
  const defaultSecondary: HeaderActionConfig = {
    label: "Explore the full launch lineup",
    href: BROWSE_PATH,
    variant: "outline",
  }

  const resolvedPrimary =
    primaryAction === undefined ? defaultPrimary : primaryAction
  const resolvedSecondary =
    secondaryAction === undefined ? defaultSecondary : secondaryAction

  const renderAction = (action: HeaderActionConfig, index: number) => {
    const variant = action.variant ?? (index === 0 ? "default" : "outline")
    const baseClass =
      variant === "default" ? HERO_PRIMARY_CLASSES : HERO_SECONDARY_CLASSES
    const composedClasses = cn(baseClass, action.className)
    const Icon = variant === "default" ? Rocket : Play

    return (
      <Link key={action.href} href={action.href} className={composedClasses}>
        <Icon className="h-4 w-4" aria-hidden="true" />
        {action.label}
      </Link>
    )
  }

  const isDefaultHeadline = title === undefined
  const hasMetrics = metrics.length > 0
  return (
    <div className="space-y-6">
      <section className="mx-auto grid w-full max-w-7xl gap-6 px-1 sm:px-0 lg:grid-cols-[minmax(0,2.4fr)_minmax(0,0.85fr)]">
        <div className="flex flex-col gap-6 rounded-[28px] border border-border/70 bg-white/95 p-6 shadow-[0_28px_80px_-60px_rgba(15,23,42,0.3)] sm:p-10">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[color:var(--brand-1)]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-1)]">
            <span aria-hidden="true">🚀</span>
            {resolvedEyebrow}
          </span>
          <div className="space-y-4 text-balance">
            {isDefaultHeadline ? (
              <h1 className="text-4xl font-semibold tracking-tight text-[#1C2333] sm:text-5xl">
                <span className="text-[color:var(--brand-1)]">
                  Get free SEO backlinks.
                </span>
                <br className="hidden sm:block" />
                Explore inspiring products.
                <br className="hidden sm:block" />
                <span className="text-[color:var(--brand-1)]">Launch</span> to
                people who care.
                <br className="hidden sm:block" />
                <span className="text-[color:var(--brand-2)]">Rise</span>{" "}
                together.
              </h1>
            ) : (
              <h1 className="text-4xl font-semibold tracking-tight text-[#1C2333] sm:text-5xl">
                {resolvedTitle}
              </h1>
            )}
            <p className="max-w-xl text-base text-[#3B4256] sm:text-lg">
              {resolvedDescription}
            </p>
          </div>
          {(resolvedPrimary ?? resolvedSecondary) ? (
            <div className="flex flex-wrap items-center gap-3">
              {resolvedPrimary ? renderAction(resolvedPrimary, 0) : null}
              {resolvedSecondary ? renderAction(resolvedSecondary, 1) : null}
            </div>
          ) : null}
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Trusted by 100+ founders
            </p>
            <p className="text-sm text-muted-foreground">
              Every launch earns a permanent Shipyard backlink plus community
              upvotes from indie makers and early adopters.
            </p>
          </div>
          {hasMetrics ? (
            <dl className="grid gap-4 border-t border-border/60 pt-6 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => {
                const rawValue = stats[metric.key]
                return (
                  <div
                    key={metric.key}
                    className="rounded-2xl border border-border/60 bg-white px-5 py-4 shadow-sm"
                  >
                    <dt className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                      {metric.label}
                    </dt>
                    <dd className="mt-2 text-2xl font-semibold text-foreground">
                      {(
                        metric.formatter ??
                        ((value: number) => value.toLocaleString())
                      )(rawValue)}
                    </dd>
                  </div>
                )
              })}
            </dl>
          ) : null}
        </div>
        {aside ? (
          <aside className="flex w-full max-w-sm flex-col gap-4 justify-self-end">
            {aside}
          </aside>
        ) : null}
      </section>
      <StickyBannerRegion priority={10} className="rounded-2xl" />
    </div>
  )
}

export default DirectoryHeader
