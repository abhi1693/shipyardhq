import Link from "next/link"
import { Play, Rocket } from "lucide-react"

import { cn } from "@/lib/utils"
import { BROWSE_PATH, MEMBER_PRODUCTS_PATH } from "@/lib/routes"

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
}

const HERO_PRIMARY_CLASSES =
  "inline-flex h-11 min-w-[12rem] items-center justify-center gap-2 rounded-full bg-[#111827] px-6 text-sm font-semibold text-white shadow-[0_18px_30px_-18px_rgba(17,24,39,0.6)] transition hover:bg-[#0f172a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827]/20 focus-visible:ring-offset-2 focus-visible:ring-offset-white"

const HERO_SECONDARY_CLASSES =
  "inline-flex h-11 min-w-[12rem] items-center justify-center gap-2 rounded-full border border-border/80 bg-white px-6 text-sm font-semibold text-foreground shadow-[0_12px_28px_-24px_rgba(15,23,42,0.22)] transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-1)]/15 focus-visible:ring-offset-2 focus-visible:ring-offset-white"

export function DirectoryHeader({
  stats,
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  metrics = [],
}: DirectoryHeaderProps) {
  const resolvedEyebrow =
    typeof eyebrow === "string" && eyebrow.trim().length > 0
      ? eyebrow.trim()
      : null
  const resolvedTitle = title ?? "Shipyard homepage"
  const resolvedDescription =
    description ??
    "Launch once, and we handle the distribution—your story hits the right builders, fast."
  const contentGapClass = resolvedEyebrow ? "gap-6" : "gap-5"

  const defaultPrimary: HeaderActionConfig = {
    label: "Launch your product now",
    href: MEMBER_PRODUCTS_PATH,
  }
  const defaultSecondary: HeaderActionConfig = {
    label: "Browse today's launches",
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
      <section
        className={cn(
          "flex flex-col rounded-[28px] border border-border/70 bg-white p-6 shadow-[0_24px_80px_-60px_rgba(15,23,42,0.28)] sm:p-12",
          contentGapClass,
        )}
      >
        {resolvedEyebrow ? (
          <span className="inline-flex w-fit items-center gap-2 self-center rounded-full border border-border/80 bg-muted/40 px-4 py-1.5 text-xs font-semibold tracking-[0.18em] text-[color:var(--brand-1)]">
            <span aria-hidden="true">🚀</span>
            {resolvedEyebrow}
          </span>
        ) : null}
        <div className="space-y-4 text-balance text-center">
          {isDefaultHeadline ? (
            <h1 className="text-4xl font-semibold tracking-tight text-[#1C2333] sm:text-[2.4rem]">
              <span className="bg-gradient-to-r from-[color:var(--brand-1)] to-[color:var(--brand-2)] bg-clip-text text-transparent">
                Secure
              </span>{" "}
              backlinks that rank fast.{" "}
              <span className="text-[color:var(--brand-3)]">Ship</span> updates
              in seconds.{" "}
              <span className="text-[color:var(--brand-2)]">Grow</span> with our
              builder community.
            </h1>
          ) : (
            <h1 className="text-4xl font-semibold tracking-tight text-[#1C2333] sm:text-5xl">
              {resolvedTitle}
            </h1>
          )}
          <p className="mx-auto max-w-xl text-base text-[#3B4256] sm:text-lg">
            {resolvedDescription}
          </p>
        </div>
        {(resolvedPrimary ?? resolvedSecondary) ? (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {resolvedPrimary ? renderAction(resolvedPrimary, 0) : null}
            {resolvedSecondary ? renderAction(resolvedSecondary, 1) : null}
          </div>
        ) : null}
        {hasMetrics ? (
          <dl className="grid gap-4 border-t border-border/60 pt-6 text-center sm:grid-cols-2 xl:grid-cols-4">
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
      </section>
    </div>
  )
}

export default DirectoryHeader
