import Link from "next/link"
import { Play, Rocket } from "lucide-react"

import { cn } from "@/lib/utils"
import { StickyBannerRegion } from "@/components/layout/sticky-banner-context"
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

export type HeroShowcaseProduct = {
  id?: string
  name: string
  tagline: string
  votes?: number | string | null
  sponsored?: boolean
  badge?: string | null
  placeholder?: boolean
}

interface DirectoryHeaderProps {
  stats: StatsShape
  eyebrow?: string
  title?: string
  description?: string
  primaryAction?: HeaderActionConfig | null
  secondaryAction?: HeaderActionConfig | null
  metrics?: readonly MetricConfig[]
  highlightedProducts?: readonly HeroShowcaseProduct[]
}

const HERO_PRIMARY_CLASSES =
  "inline-flex min-h-[3.25rem] min-w-[12.5rem] items-center justify-center gap-2 rounded-full bg-[#1C2333] px-7 text-base font-semibold text-white shadow-[0_24px_48px_-28px_rgba(28,35,51,0.75)] transition hover:bg-[#17202E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C2333]/15 focus-visible:ring-offset-2 focus-visible:ring-offset-white"

const HERO_SECONDARY_CLASSES =
  "inline-flex min-h-[3.25rem] min-w-[12.5rem] items-center justify-center gap-2 rounded-full border border-[#1C2333]/20 bg-white px-7 text-base font-semibold text-[#1C2333] shadow-[0_18px_40px_-32px_rgba(28,35,51,0.45)] transition hover:border-[#1C2333]/40 hover:text-[#17202E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C2333]/10 focus-visible:ring-offset-2 focus-visible:ring-offset-white"

export function DirectoryHeader({
  stats,
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  metrics = [],
  highlightedProducts,
}: DirectoryHeaderProps) {
  const resolvedEyebrow = eyebrow ?? "Launch today · Claim your backlink"
  const resolvedTitle = title ?? "Shipyard homepage"
  const resolvedDescription =
    description ??
    "Shipyard is the curated hub where indie founders submit in minutes, surface on curated feeds, and unlock free SEO backlinks that drive lasting discovery."

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
  const primaryProducts =
    highlightedProducts && highlightedProducts.length > 0
      ? highlightedProducts.slice(0, 2)
      : []

  const placeholderSlots = Math.max(0, 2 - primaryProducts.length)
  const placeholderProducts: HeroShowcaseProduct[] = Array.from(
    { length: placeholderSlots },
    (_, index) => ({
      id: `placeholder-${index}`,
      name: "Advertise here",
      tagline: "Put your launch front and center for thousands of founders.",
      sponsored: true,
      placeholder: true,
    }),
  )

  const resolvedProducts: HeroShowcaseProduct[] = [
    ...primaryProducts,
    ...placeholderProducts,
  ]

  return (
    <div className="space-y-8">
      <section
        className="relative overflow-hidden rounded-[32px] border border-[#E4E8F5] bg-white px-6 py-12 shadow-[0_45px_140px_-80px_rgba(28,35,51,0.65)] md:px-12"
      >
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:items-center">
          <div className="space-y-8">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#DADFF0] bg-[linear-gradient(135deg,#F3EDFF_0%,#FFFFFF_50%,#ECF9FF_100%)] px-5 py-2 text-sm font-semibold text-[#4F3FF4] shadow-[0_24px_44px_-32px_rgba(28,35,51,0.45)]">
              <span aria-hidden="true">🚀</span>
              {resolvedEyebrow}
            </span>
            <div className="space-y-6 text-balance">
              <h1 className="text-4xl font-semibold tracking-tight text-[#1C2333] sm:text-5xl lg:text-6xl">
                {isDefaultHeadline ? (
                  <>
                    Launch today.
                    <br className="hidden sm:block" />
                    <span className="bg-gradient-to-br from-[#7F5AF0] via-[#6D8CF8] to-[#2CB1BC] bg-clip-text text-transparent">
                      Claim free SEO backlinks.
                    </span>{" "}
                    <br className="hidden sm:block" />
                    Grow with builders who care.
                  </>
                ) : (
                  resolvedTitle
                )}
              </h1>
              <p className="max-w-xl text-lg text-[#3B4256]">{resolvedDescription}</p>
            </div>
            {(resolvedPrimary ?? resolvedSecondary) ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                {resolvedPrimary ? renderAction(resolvedPrimary, 0) : null}
                {resolvedSecondary ? renderAction(resolvedSecondary, 1) : null}
              </div>
            ) : null}
            <div className="space-y-1.5">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#1C2333]">
                Trusted by 100+ founders
              </p>
              <p className="text-sm font-medium text-[#5B6175]">
                Every launch earns a permanent Shipyard backlink plus community
                upvotes from indie makers and early adopters.
              </p>
            </div>
          </div>
          <div className="relative lg:ml-auto">
            <div className="absolute inset-0 -translate-y-20 scale-[1.2] rounded-[40px] bg-gradient-to-br from-[#EEF3FF] via-[#FFFFFF] to-[#E6FCFF] blur-3xl" />
            <div className="relative mx-auto flex w-full max-w-md flex-col gap-5 rounded-[36px] border border-[#E0E7F8] bg-[#FBFCFF] p-8 shadow-[0_40px_120px_-70px_rgba(28,35,51,0.65)] lg:ml-auto lg:mr-0">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#F6F3FF] px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#6C5AF2]">
                  Community Launchpad
                </div>
                <h2 className="text-2xl font-semibold text-[#1C2333]">
                  Ship faster with friendly feedback.
                </h2>
                <p className="text-sm text-[#3B4256]">
                  Makers share launches, earn upvotes, and climb to the top
                  showcase watched by early adopters.
                </p>
              </div>
              <div className="space-y-4">
                {resolvedProducts.map((product, index) => {
                  const votes =
                    typeof product.votes === "number"
                      ? product.votes.toLocaleString()
                      : product.votes
                  const isPlaceholder = Boolean(product.placeholder)

                  return (
                    <div
                      key={product.id ?? product.name}
                      className={cn(
                        "rounded-3xl p-5 shadow-[0_28px_70px_-50px_rgba(28,35,51,0.55)] transition",
                        isPlaceholder
                          ? "border border-dashed border-[#D9E1F5] bg-[#F9FAFF]"
                          : cn(
                              "bg-white",
                              index === 0
                                ? "border border-[#F0E8FF]"
                                : "border border-[#E9EEF9]",
                            ),
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p
                            className={cn(
                              "text-base font-semibold text-[#1C2333]",
                              isPlaceholder && "text-[#4F3FF4]",
                            )}
                          >
                            {isPlaceholder ? "Advertise here" : product.name}
                          </p>
                          <p className="mt-1 text-sm text-[#5B6175]">
                            {isPlaceholder
                              ? "Feature your product in this premium slot and win consistent discovery."
                              : product.tagline}
                          </p>
                        </div>
                        {isPlaceholder ? (
                          <div className="rounded-full border border-[#4F3FF4]/30 bg-white px-3 py-1 text-xs font-semibold text-[#4F3FF4]">
                            Reserve spot
                          </div>
                        ) : (
                          <div className="rounded-full bg-[#1C2333] px-3 py-1 text-xs font-semibold text-white">
                            {votes ?? "—"}
                            <span className="ml-1 text-[0.65rem] font-normal opacity-80">
                              votes
                            </span>
                          </div>
                        )}
                      </div>
                      {product.badge || product.sponsored ? (
                        <div className="mt-4 inline-flex items-center rounded-full bg-[#F3F0FF] px-3 py-1 text-xs font-semibold text-[#5B43F7]">
                          {isPlaceholder ? "Homepage slot available" : "Sponsored"}
                        </div>
                      ) : null}
                      {isPlaceholder ? (
                        <div className="mt-5 inline-flex rounded-full border border-[#4F3FF4] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#4F3FF4]">
                          Talk to sales
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
              <div className="rounded-3xl border border-[#F0E8FF] bg-[#F8F5FF] p-5 text-sm text-[#4F3FF4]">
                Want to boost visibility? Unlock featured placements that stay
                pinned to the top of discovery feeds.
              </div>
            </div>
          </div>
        </div>
        {hasMetrics ? (
          <dl className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric) => {
              const rawValue = stats[metric.key]
              return (
                <div
                  key={metric.key}
                  className="rounded-2xl border border-[#E6EAF6] bg-white px-6 py-5 shadow-[0_25px_60px_-45px_rgba(28,35,51,0.6)]"
                >
                  <dt className="text-xs font-semibold uppercase tracking-[0.28em] text-[#697089]">
                    {metric.label}
                  </dt>
                  <dd className="mt-3 text-2xl font-semibold text-[#1C2333]">
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
      <StickyBannerRegion priority={10} className="rounded-2xl" />
    </div>
  )
}

export default DirectoryHeader
