import Link from "next/link"

import { Button } from "@/components/atoms/button"
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

const defaultMetrics: readonly MetricConfig[] = [
  {
    key: "totalProducts",
    label: "Products launched",
    formatter: (value: number) => value.toLocaleString(),
  },
  {
    key: "totalCreators",
    label: "Builders on deck",
    formatter: (value: number) => value.toLocaleString(),
  },
  {
    key: "totalUpvotes",
    label: "Community endorsements",
    formatter: (value: number) => value.toLocaleString(),
  },
  {
    key: "totalInsights",
    label: "Insights generated",
    formatter: (value: number) => value.toLocaleString(),
  },
] as const

export function DirectoryHeader({
  stats,
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  metrics = defaultMetrics,
}: DirectoryHeaderProps) {
  const resolvedEyebrow = eyebrow ?? "Shipyard Directory"
  const resolvedTitle = title ?? "Shipyard launch directory"
  const resolvedDescription =
    description ??
    "Shipyard is the launch directory built for builders, investors, and operator-fans to discover breakout products."

  const defaultPrimary: HeaderActionConfig = {
    label: "Explore the full launch lineup",
    href: BROWSE_PATH,
  }
  const defaultSecondary: HeaderActionConfig = {
    label: "Submit your launch",
    href: MEMBER_PRODUCTS_PATH,
    variant: "outline",
  }

  const resolvedPrimary = primaryAction === undefined ? defaultPrimary : primaryAction
  const resolvedSecondary =
    secondaryAction === undefined ? defaultSecondary : secondaryAction

  const renderAction = (action: HeaderActionConfig, index: number) => {
    const variant = action.variant ?? (index === 0 ? "default" : "outline")
    const buttonProps =
      variant === "ghost"
        ? {
            variant: "ghost" as const,
            className:
              action.className ?? "hover:bg-muted/60 text-muted-foreground",
          }
        : variant === "outline"
          ? {
              variant: "outline" as const,
              className:
                action.className ??
                "border-border/70 text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground",
            }
          : variant === "secondary"
            ? {
                variant: "secondary" as const,
                className: action.className,
              }
            : {
                variant: "default" as const,
                className: action.className,
              }

    return (
      <Button key={action.href} asChild size="lg" {...buttonProps}>
        <Link href={action.href}>{action.label}</Link>
      </Button>
    )
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-background/90 px-6 py-12 shadow-lg shadow-black/5 backdrop-blur md:px-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(110%_90%_at_0%_0%,var(--brand-1)/0.12,transparent_60%),radial-gradient(110%_90%_at_100%_20%,var(--brand-2)/0.12,transparent_65%)]"
      />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-5">
          <span className="inline-flex items-center gap-2 rounded-full bg-muted/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.26em] text-muted-foreground">
            {resolvedEyebrow}
          </span>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {resolvedTitle}
            </h1>
            <p className="max-w-xl text-base text-muted-foreground">
              {resolvedDescription}
            </p>
          </div>
          {(resolvedPrimary ?? resolvedSecondary) ? (
            <div className="flex flex-wrap items-center gap-3">
              {resolvedPrimary ? renderAction(resolvedPrimary, 0) : null}
              {resolvedSecondary ? renderAction(resolvedSecondary, 1) : null}
            </div>
          ) : null}
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
                  {(metric.formatter ?? ((value: number) => value.toLocaleString()))(
                    rawValue,
                  )}
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
