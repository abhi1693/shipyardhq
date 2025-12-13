import Link from "next/link"
import { Play, Rocket } from "lucide-react"

import { cn } from "@/lib/utils"
import { BROWSE_PATH, MEMBER_PRODUCTS_PATH } from "@/lib/routes"
import { SquareImage } from "@/components/molecules/SquareImage"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/atoms/tooltip"

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
  pageViews30?: number
  visitors30?: number
  trafficSeries?: Array<{
    date: string
    pageViews: number
    visitors: number
  }>
}

type MetricConfig = {
  key: keyof StatsShape
  label: string
  formatter?: (value: number) => string
}

type ProviderDescriptor = {
  name: string
  logoSrc?: string
}

interface HeroProps {
  stats: StatsShape
  title?: string
  description?: string
  primaryAction?: HeaderActionConfig | null
  secondaryAction?: HeaderActionConfig | null
  metrics?: readonly MetricConfig[]
  supportedProviders?: (string | ProviderDescriptor)[]
}

const HERO_PRIMARY_CLASSES =
  "inline-flex h-11 min-w-[12rem] items-center justify-center gap-2 rounded-full bg-[#111827] px-6 text-sm font-semibold text-white shadow-[0_18px_30px_-18px_rgba(17,24,39,0.6)] transition hover:bg-[#0f172a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827]/20 focus-visible:ring-offset-2 focus-visible:ring-offset-white"

const HERO_SECONDARY_CLASSES =
  "inline-flex h-11 min-w-[12rem] items-center justify-center gap-2 rounded-full border border-border/80 bg-white px-6 text-sm font-semibold text-foreground shadow-[0_12px_28px_-24px_rgba(15,23,42,0.22)] transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-1)]/15 focus-visible:ring-offset-2 focus-visible:ring-offset-white"

export function Hero({
  stats,
  title,
  description,
  primaryAction,
  secondaryAction,
  metrics = [],
  supportedProviders,
}: HeroProps) {
  const resolvedTitle = title ?? "Shipyard homepage"
  const isDefaultHeadline = title === undefined
  const fallbackDescription = isDefaultHeadline
    ? "Ranked by real interest — not launch-day hype."
    : null
  const resolvedDescription =
    typeof description === "string"
      ? description.trim().length > 0
        ? description.trim()
        : null
      : fallbackDescription
  const contentGapClass = "gap-5"

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

  const providers =
    supportedProviders
      ?.map((provider): ProviderDescriptor | null => {
        if (typeof provider === "string") {
          const name = provider.trim()
          return name.length > 0 ? { name } : null
        }
        const name = provider.name?.trim() ?? ""
        const logoSrc = provider.logoSrc?.trim()
        if (!name) return null
        const normalizedLogo =
          logoSrc && !logoSrc.startsWith("/") ? `/${logoSrc}` : logoSrc
        return { name, logoSrc: normalizedLogo }
      })
      .filter(
        (provider): provider is ProviderDescriptor => provider !== null,
      ) ?? []
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

  const hasProviders = providers.length > 0
  const hasMetrics = metrics.length > 0
  return (
    <div className="space-y-6">
      <section
        className={cn(
          "flex flex-col rounded-[28px] border border-border/70 bg-white p-6 shadow-[0_24px_80px_-60px_rgba(15,23,42,0.28)] sm:p-12",
          contentGapClass,
        )}
      >
        <div className="space-y-4 text-balance text-center">
          {isDefaultHeadline ? (
            <h1 className="text-4xl font-semibold tracking-tight text-[#1C2333] sm:text-[2.4rem]">
              Shipyard shows{" "}
              <span className="bg-gradient-to-r from-[color:var(--brand-1)] to-[color:var(--brand-2)] bg-clip-text text-transparent">
                what builders are actually clicking on
              </span>
              .
            </h1>
          ) : (
            <h1 className="text-4xl font-semibold tracking-tight text-[#1C2333] sm:text-5xl">
              {resolvedTitle}
            </h1>
          )}
          {resolvedDescription ? (
            <p className="mx-auto max-w-xl text-base text-[#3B4256] sm:text-lg">
              {resolvedDescription}
            </p>
          ) : null}
        </div>
        {(resolvedPrimary ?? resolvedSecondary) ? (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {resolvedPrimary ? renderAction(resolvedPrimary, 0) : null}
            {resolvedSecondary ? renderAction(resolvedSecondary, 1) : null}
          </div>
        ) : null}
        {hasProviders ? (
          <section
            aria-label="Supported payment providers"
            className="flex flex-col items-center gap-3 px-4 py-3 sm:px-6"
          >
            <p className="text-center text-sm text-[#3B4256]">
              We sync revenue directly from your payment stack.
            </p>
            <ul className="mt-3 flex flex-wrap items-center justify-center gap-3">
              {providers.map((provider) => (
                <Tooltip key={provider.name}>
                  <TooltipTrigger asChild>
                    <li className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md border border-border/70 bg-white">
                      {provider.logoSrc ? (
                        <SquareImage
                          src={provider.logoSrc}
                          alt={`${provider.name} logo`}
                          size={44}
                          className="h-10 w-10 object-contain"
                        />
                      ) : (
                        <span className="sr-only">
                          {provider.name} logo placeholder
                        </span>
                      )}
                    </li>
                  </TooltipTrigger>
                  <TooltipContent
                    sideOffset={6}
                    className="text-xs font-semibold"
                  >
                    {provider.name}
                  </TooltipContent>
                </Tooltip>
              ))}
            </ul>
          </section>
        ) : null}
        {hasMetrics ? (
          <dl className="grid gap-4 border-t border-border/60 pt-6 text-center sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => {
              const rawValue = stats[metric.key]
              const numericValue =
                typeof rawValue === "number"
                  ? rawValue
                  : Array.isArray(rawValue)
                    ? rawValue.length
                    : 0
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
                    )(numericValue)}
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

export default Hero
