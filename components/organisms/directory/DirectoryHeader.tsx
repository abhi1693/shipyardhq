import Link from "next/link"
import { Rocket } from "lucide-react"

import { cn } from "@/lib/utils"
import { StickyBannerRegion } from "@/components/layout/sticky-banner-context"
import { launchPrimaryButton, launchSecondaryButton } from "@/lib/ui/buttons"
import { brandGradient, gradientTint } from "@/lib/ui/tints"
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
    const composedClasses =
      variant === "default"
        ? launchPrimaryButton({ size: "lg", className: action.className })
        : launchSecondaryButton({ size: "lg", className: action.className })

    return (
      <Link key={action.href} href={action.href} className={composedClasses}>
        {variant === "default" ? (
          <Rocket className="h-4 w-4" aria-hidden="true" />
        ) : null}
        {action.label}
      </Link>
    )
  }

  return (
    <div className="space-y-6">
      <section
        className={brandGradient(
          "relative overflow-hidden rounded-3xl border border-border px-6 py-12 shadow-sm md:px-10",
        )}
      >
        <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="space-y-5">
            <span
              className={gradientTint(
                "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.26em] text-white/80",
              )}
            >
              {resolvedEyebrow}
            </span>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {resolvedTitle}
              </h1>
              <p className="max-w-xl text-base text-white/80">
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
                    "rounded-2xl border border-border bg-white p-5 shadow-sm",
                  )}
                >
                  <dt className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
                    {metric.label}
                  </dt>
                  <dd className="mt-3 text-2xl font-semibold text-foreground">
                    {(
                      metric.formatter ??
                      ((value: number) => value.toLocaleString())
                    )(rawValue)}
                  </dd>
                </div>
              )
            })}
          </dl>
        </div>
      </section>
      <StickyBannerRegion priority={10} className="rounded-2xl" />
    </div>
  )
}

export default DirectoryHeader
