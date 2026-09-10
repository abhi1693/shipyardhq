import Link from "next/link"
import { PublicAdLayout } from "@/components/templates/public/common/PublicAdLayout"

import { getFeaturedAlternatives } from "@/actions/public/alternatives/actions"
import { getCategoryHighlights } from "@/actions/public/categories/actions"
import type { PeriodicLeaderboardPayload } from "@/actions/public/leaderboard/actions"
import { getPartnerSpotlightProduct } from "@/actions/public/products/featured"
import { getUseCaseHighlights } from "@/actions/public/use-cases/actions"
import { Button } from "@/components/atoms/button"
import { Card, CardContent } from "@/components/atoms/card"
import { ProductLogoImage } from "@/components/atoms/product-logo-image"
import { ProductCategoryPills } from "@/components/molecules/ProductCategoryPills"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { mapProductCardRecordToBase } from "@/lib/products/selects"
import { getPriorityPlacementPlanIds } from "@/lib/products/priority-plans"
import {
  ALTERNATIVES_PATH,
  BROWSE_PATH,
  CATEGORIES_PATH,
  HOME_PATH,
  LEADERBOARD_PATH,
  LEADERBOARD_MONTHLY_PATH,
  USERS_PATH,
  USE_CASES_PATH,
  alternativePath,
  categoryPath,
  productCardPath,
  usecasePath,
} from "@/lib/routes"
import {
  getIsoWeekKey,
  getIsoWeekYearAndNumber,
} from "@/lib/server/leaderboard/weeks"
import { buildProductListItem } from "@/lib/seo/product-list"
import { resolveSiteUrl } from "@/lib/siteConfig"
import { cn } from "@/lib/utils"
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react"
import {
  ArrowRight,
  BadgeCheck,
  ChevronUp,
  ExternalLink,
  Rocket,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react"

function buildPath(
  period: PeriodicLeaderboardPayload["period"],
  start: Date,
): string {
  if (period === "day") {
    const month = start.getUTCMonth() + 1
    const day = start.getUTCDate()
    return `/leaderboard/daily/${start.getUTCFullYear()}/${month}/${day}`
  }
  if (period === "week") {
    const { year, week } = getIsoWeekYearAndNumber(start)
    return `/leaderboard/weekly/${year}/${week}`
  }
  const month = start.getUTCMonth() + 1
  return `/leaderboard/monthly/${start.getUTCFullYear()}/${month}`
}

type PeriodicLeaderboardFilters = {
  categorySlug?: string | null
}

function withLeaderboardFilters(
  path: string,
  filters: PeriodicLeaderboardFilters,
): string {
  const [basePath, existingQuery] = path.split("?")
  const params = new URLSearchParams(existingQuery ?? "")

  const categorySlug =
    typeof filters.categorySlug === "string" &&
    filters.categorySlug.trim().length
      ? filters.categorySlug.trim()
      : null

  if (categorySlug) {
    params.set("category", categorySlug)
  } else {
    params.delete("category")
  }

  const query = params.toString()
  return query ? `${basePath}?${query}` : basePath
}

function getAdjacentStart(
  period: PeriodicLeaderboardPayload["period"],
  start: Date,
  delta = 1,
) {
  const next = new Date(start)
  if (period === "day") {
    next.setUTCDate(start.getUTCDate() + delta)
  } else if (period === "week") {
    next.setUTCDate(start.getUTCDate() + delta * 7)
  } else {
    next.setUTCMonth(start.getUTCMonth() + delta)
  }
  return next
}

type LeaderboardCardItem = ReturnType<typeof mapProductCardRecordToBase> & {
  interest?: null
  badges?: string[]
  leaderboardRank?: number
}

function getLeaderboardCardHref(item: LeaderboardCardItem) {
  return productCardPath(item.slug, { sponsored: item.sponsored })
}

function getSponsoredRedirectLinkProps(sponsored?: boolean | null) {
  return sponsored
    ? {
        prefetch: false as const,
        target: "_blank" as const,
        rel: "noopener noreferrer sponsored",
      }
    : {}
}

type MonthArchiveEntry = {
  label: string
  displayLabel: string
  path: string
  year: number
  month: number
  active: boolean
}

type MonthArchiveGroup = {
  year: number
  months: MonthArchiveEntry[]
}

const productInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "S"

function ArchiveLogo({
  item,
  size = "large",
}: {
  item: LeaderboardCardItem
  size?: "large" | "small"
}) {
  const dimension = size === "large" ? 64 : 48

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden border border-[#E2E8F0] bg-[#F8FAFC] text-sm font-bold text-[#061d31]",
        size === "large" ? "size-16 rounded-xl" : "size-12 rounded-lg",
      )}
    >
      {item.logo ? (
        <ProductLogoImage
          src={item.logo}
          name={item.name}
          width={dimension}
          height={dimension}
          sizes={`${dimension}px`}
          className="h-full w-full object-contain"
        />
      ) : (
        <span>{productInitials(item.name)}</span>
      )}
    </div>
  )
}

function RankBadge({ rank }: { rank: number }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1 text-[12px] font-semibold leading-4 text-[#43474c]">
      #{rank}
    </span>
  )
}

function CategoryPills({
  item,
  dark = false,
}: {
  item: LeaderboardCardItem
  dark?: boolean
}) {
  return (
    <ProductCategoryPills
      categories={item.categories}
      className="gap-1.5"
      pillClassName={cn(
        "rounded border-0 px-2 py-1 text-[11px] font-medium uppercase leading-[14px]",
        dark ? "bg-white/10 text-white/80" : "bg-[#F8FAFC] text-[#43474c]",
      )}
      linkClassName={dark ? "hover:text-white" : undefined}
    />
  )
}

function ArchiveUpvoteStat({
  active = false,
  compact = false,
}: {
  active?: boolean
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-1 rounded-lg font-semibold transition-all",
        compact
          ? "px-3 py-2 text-[12px]"
          : "min-w-[72px] flex-col px-4 py-3 text-[12px]",
        active ? "bg-[#0051d5] text-white" : "bg-[#EFF6FF] text-[#0051d5]",
      )}
    >
      <ChevronUp
        className={cn("size-4", active && "fill-current")}
        aria-hidden
      />
    </div>
  )
}

function AwardPills({ rank }: { rank: number }) {
  const pills =
    rank === 1
      ? [
          { label: "Product of the Week #1", icon: Trophy },
          { label: "Product of the Month #1", icon: BadgeCheck },
        ]
      : rank === 2
        ? [
            { label: "Product of the Week #3", icon: Trophy },
            { label: "Product of the Day #1", icon: BadgeCheck },
          ]
        : rank === 3
          ? [{ label: "Product of the Week #2", icon: Sparkles }]
          : []

  if (!pills.length) return null

  return (
    <>
      {pills.map(({ label, icon: Icon }) => (
        <span
          key={label}
          className="inline-flex items-center gap-1 rounded border border-yellow-100 bg-yellow-50 px-2 py-1 text-[11px] font-medium leading-[14px] text-yellow-700"
        >
          <Icon className="size-3.5" aria-hidden />
          {label}
        </span>
      ))}
    </>
  )
}

function FeaturedArchiveCard({
  item,
  rank,
}: {
  item: LeaderboardCardItem
  rank: number
}) {
  const isTop = rank === 1
  const href = getLeaderboardCardHref(item)
  const redirectLinkProps = getSponsoredRedirectLinkProps(item.sponsored)

  return (
    <Card
      className={cn(
        "relative rounded-xl border-[#E2E8F0] bg-white p-0 shadow-none transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)]",
        isTop && "border-l-4 border-l-[#F97316]",
      )}
    >
      <CardContent className="p-5 md:p-6">
        {isTop ? (
          <div className="absolute right-4 top-4">
            <RankBadge rank={rank} />
          </div>
        ) : null}
        <div className="flex items-start gap-4 md:gap-5">
          <Link href={href} {...redirectLinkProps} className="shrink-0">
            <ArchiveLogo item={item} />
          </Link>
          <div className="min-w-0 flex-1 pr-0 md:pr-4">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h3 className="text-[18px] font-semibold leading-6 text-black">
                <Link
                  href={href}
                  {...redirectLinkProps}
                  className="hover:underline"
                >
                  {item.name}
                </Link>
              </h3>
              {!isTop ? <RankBadge rank={rank} /> : null}
              {item.sponsored ? (
                <span className="rounded bg-[#F97316]/10 px-2 py-0.5 text-[9px] font-extrabold uppercase leading-[10px] tracking-wider text-[#b45309]">
                  Sponsored
                </span>
              ) : null}
            </div>
            <p className="mb-4 line-clamp-2 max-w-lg text-[14px] leading-5 text-[#43474c]">
              {item.tagline}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <CategoryPills item={item} />
              <AwardPills rank={rank} />
            </div>
          </div>
          <ArchiveUpvoteStat active={isTop} />
        </div>
      </CardContent>
    </Card>
  )
}

function CompactArchiveRow({
  item,
  rank,
}: {
  item: LeaderboardCardItem
  rank: number
}) {
  const href = getLeaderboardCardHref(item)
  const redirectLinkProps = getSponsoredRedirectLinkProps(item.sponsored)

  return (
    <Card className="rounded-xl border-[#E2E8F0] bg-white p-0 shadow-none transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div className="flex min-w-0 items-center gap-4">
          <span className="w-7 shrink-0 text-[12px] font-semibold leading-4 text-[#43474c]">
            #{rank}
          </span>
          <Link href={href} {...redirectLinkProps} className="shrink-0">
            <ArchiveLogo item={item} size="small" />
          </Link>
          <div className="min-w-0">
            <h3 className="truncate text-[18px] font-semibold leading-6 text-black">
              <Link
                href={href}
                {...redirectLinkProps}
                className="hover:underline"
              >
                {item.name}
              </Link>
            </h3>
            <p className="line-clamp-1 text-[14px] leading-5 text-[#43474c]">
              {item.tagline}
            </p>
            <CategoryPills item={item} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <ArchiveUpvoteStat compact />
        </div>
      </CardContent>
    </Card>
  )
}

function ArchiveSegmentedNav({
  start,
  filters,
  activePeriod,
}: {
  start: Date
  filters: PeriodicLeaderboardFilters
  activePeriod: PeriodicLeaderboardPayload["period"]
}) {
  const entries: Array<{
    label: string
    period: PeriodicLeaderboardPayload["period"]
  }> = [
    { label: "Daily", period: "day" },
    { label: "Weekly", period: "week" },
    { label: "Monthly", period: "month" },
  ]

  return (
    <div className="flex w-fit rounded-xl border border-[#E2E8F0] bg-[#eff4ff] p-1">
      {entries.map((entry) => (
        <Link
          key={entry.period}
          href={withLeaderboardFilters(buildPath(entry.period, start), filters)}
          className={cn(
            "rounded-lg px-4 py-1.5 text-[12px] font-semibold uppercase leading-4 tracking-[0.05em] transition-all",
            entry.period === activePeriod
              ? "bg-black text-white shadow-sm"
              : "text-[#43474c] hover:text-black",
          )}
        >
          {entry.label}
        </Link>
      ))}
    </div>
  )
}

function InlinePartnerSpotlight({
  product,
}: {
  product: Awaited<ReturnType<typeof getPartnerSpotlightProduct>>
}) {
  if (!product) return null

  const href = `/r/sponsored/${product.slug}`

  return (
    <div className="my-6 overflow-hidden rounded-2xl bg-[#061d31] p-6 text-white">
      <div className="relative z-10 flex flex-col items-center justify-between gap-6 md:flex-row">
        <div className="flex items-center gap-6">
          <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-3 shadow-xl">
            {product.logo ? (
              <ProductLogoImage
                src={product.logo}
                name={product.name}
                width={56}
                height={56}
                sizes="56px"
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="text-lg font-bold text-[#061d31]">
                {productInitials(product.name)}
              </span>
            )}
          </div>
          <div>
            <span className="mb-2 block text-[12px] font-semibold uppercase leading-4 tracking-widest text-[#b45309]">
              Partner Spotlight
            </span>
            <h3 className="mb-2 text-[24px] font-semibold leading-8 tracking-[-0.01em] text-white">
              {product.name}
            </h3>
            <p className="max-w-md text-[14px] leading-5 text-white/80">
              {product.tagline ??
                "Get featured in front of builders scanning the monthly archive."}
            </p>
          </div>
        </div>
        <Button
          asChild
          className="h-12 whitespace-nowrap rounded-xl border-0 bg-[#F97316] px-8 text-[18px] font-semibold leading-6 text-white shadow-none hover:bg-[#F97316]/90"
        >
          <a href={href} target="_blank" rel="noopener noreferrer">
            Redeem Offer
            <ExternalLink className="size-4" aria-hidden />
          </a>
        </Button>
      </div>
    </div>
  )
}

function MonthlyArchiveSidebar({
  groups,
  buildSidebarPath,
}: {
  groups: MonthArchiveGroup[]
  buildSidebarPath: (year: number, month: number) => string
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[#E2E8F0] p-5">
        <h2 className="text-[18px] font-semibold leading-6 text-black">
          Monthly Archive
        </h2>
        <span className="rounded-full bg-black px-2 py-0.5 text-[10px] font-bold uppercase text-white">
          Historical
        </span>
      </div>
      <div className="space-y-4 p-2">
        {groups.map((group) => (
          <div key={group.year}>
            <span className="block px-3 py-2 text-[12px] font-semibold uppercase leading-4 tracking-[0.05em] text-[#43474c]">
              {group.year}
            </span>
            <div className="space-y-1">
              {group.months.map((month) => (
                <Link
                  key={month.path}
                  href={buildSidebarPath(month.year, month.month)}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-2 text-[14px] leading-5 transition-colors",
                    month.active
                      ? "bg-[#0051d5]/10 font-medium text-[#0051d5]"
                      : "text-[#0b1c30] hover:bg-[#F8FAFC]",
                  )}
                >
                  <span>{month.displayLabel}</span>
                  <ArrowRight
                    className={cn(
                      "size-4",
                      month.active ? "text-[#0051d5]" : "text-[#43474c]",
                    )}
                    aria-hidden
                  />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function MonthlyShortcuts({
  categories,
  useCases,
  alternatives,
}: {
  categories: Awaited<ReturnType<typeof getCategoryHighlights>>
  useCases: Awaited<ReturnType<typeof getUseCaseHighlights>>
  alternatives: Awaited<ReturnType<typeof getFeaturedAlternatives>>
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
      <div className="border-b border-[#E2E8F0] p-5">
        <h2 className="text-[18px] font-semibold leading-6 text-black">
          Quick shortcuts
        </h2>
      </div>
      <div className="space-y-6 p-5">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase leading-4 tracking-[0.05em] text-[#43474c]">
              Categories
            </span>
            <Link
              href={CATEGORIES_PATH}
              className="text-[11px] font-medium uppercase leading-[14px] text-[#0051d5] hover:underline"
            >
              View all
            </Link>
          </div>
          <ul className="space-y-2">
            {categories.slice(0, 3).map((category) => (
              <li key={category.id}>
                <Link
                  href={categoryPath(category.slug)}
                  className="group flex items-center gap-2 text-[14px] leading-5 hover:text-[#0051d5]"
                >
                  <span className="size-1.5 rounded-full bg-[#0051d5]" />
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase leading-4 tracking-[0.05em] text-[#43474c]">
              Use Cases
            </span>
            <Link
              href={USE_CASES_PATH}
              className="text-[11px] font-medium uppercase leading-[14px] text-[#0051d5] hover:underline"
            >
              View all
            </Link>
          </div>
          <ul className="space-y-2">
            {useCases.slice(0, 3).map((useCase) => (
              <li key={useCase.id}>
                <Link
                  href={usecasePath(useCase.slug)}
                  className="flex items-center gap-2 text-[14px] leading-5 hover:text-[#0051d5]"
                >
                  <span className="size-1.5 rounded-full bg-[#0051d5]" />
                  {useCase.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        {alternatives.length ? (
          <div className="border-t border-[#E2E8F0] pt-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[12px] font-semibold uppercase leading-4 tracking-[0.05em] text-[#43474c]">
                Alternatives
              </span>
              <Link
                href={ALTERNATIVES_PATH}
                className="text-[11px] font-medium uppercase leading-[14px] text-[#0051d5] hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {alternatives.slice(0, 3).map((alternative) => (
                <Link
                  key={alternative.id}
                  href={alternativePath(alternative.slug)}
                  className="rounded border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-1 text-[11px] font-medium leading-[14px] transition-all hover:border-[#0051d5]"
                >
                  {alternative.name}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function CommunityStatCard() {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#0051d5] to-blue-700 p-6 text-white shadow-lg">
      <h2 className="mb-2 text-[18px] font-semibold leading-6">
        Join the Fleet
      </h2>
      <p className="mb-6 text-[14px] leading-5 text-white/80">
        Connect with builders and enthusiasts shaping the future of tech.
      </p>
      <div className="mb-6 flex -space-x-3">
        {["A", "S", "M"].map((label) => (
          <div
            key={label}
            className="flex size-10 items-center justify-center rounded-full border-2 border-[#0051d5] bg-white text-xs font-bold text-[#0051d5]"
          >
            {label}
          </div>
        ))}
        <div className="flex size-10 items-center justify-center rounded-full border-2 border-[#0051d5] bg-white/20 text-[10px] font-bold">
          +2k
        </div>
      </div>
      <Button
        asChild
        className="h-12 w-full rounded-xl border-0 bg-white text-[18px] font-semibold leading-6 text-[#0051d5] shadow-none hover:bg-[#f8f9ff]"
      >
        <Link href={USERS_PATH}>
          <Users className="size-4" aria-hidden />
          Join Community
        </Link>
      </Button>
    </div>
  )
}

function PeriodicArchiveSidebar({
  groups,
  buildSidebarPath,
  categories,
  useCases,
  alternatives,
}: {
  groups: MonthArchiveGroup[]
  buildSidebarPath: (year: number, month: number) => string
  categories: Awaited<ReturnType<typeof getCategoryHighlights>>
  useCases: Awaited<ReturnType<typeof getUseCaseHighlights>>
  alternatives: Awaited<ReturnType<typeof getFeaturedAlternatives>>
}) {
  return (
    <>
      <MonthlyArchiveSidebar
        groups={groups}
        buildSidebarPath={buildSidebarPath}
      />
      <MonthlyShortcuts
        categories={categories}
        useCases={useCases}
        alternatives={alternatives}
      />
      <CommunityStatCard />
    </>
  )
}

function WeeklyAwardPills({ rank }: { rank: number }) {
  const pills =
    rank === 1
      ? [
          {
            label: "Product of the Week #1",
            icon: Trophy,
            className: "bg-[#e5eeff] text-[#0051d5]",
          },
          {
            label: "Product of the Month #1",
            icon: Sparkles,
            className: "bg-[#dce9ff] text-[#43474c]",
          },
        ]
      : rank === 2
        ? [
            {
              label: "Product of the Week #2",
              icon: Trophy,
              className: "bg-[#e5eeff] text-[#43474c]",
            },
          ]
        : rank === 3
          ? [
              {
                label: "Product of the Day #1",
                icon: Sparkles,
                className: "bg-[#ffedd5] text-[#9a3412]",
              },
            ]
          : []

  if (!pills.length) return null

  return (
    <>
      {pills.map(({ label, icon: Icon, className }) => (
        <span
          key={label}
          className={cn(
            "inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium leading-[14px]",
            className,
          )}
        >
          <Icon className="size-3.5" aria-hidden />
          {label}
        </span>
      ))}
    </>
  )
}

function WeeklyRangeNav({
  weeks,
  start,
  filters,
  todayUtc,
}: {
  weeks: Array<{
    path: string
    label: string
    active: boolean
    disabled: boolean
  }>
  start: Date
  filters: PeriodicLeaderboardFilters
  todayUtc: Date
}) {
  const prevWeek = getAdjacentStart("week", start, -1)
  const nextWeek = getAdjacentStart("week", start, 1)
  const prevDisabled = prevWeek.getTime() > todayUtc.getTime()
  const nextDisabled = nextWeek.getTime() > todayUtc.getTime()

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      {prevDisabled ? (
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-[#43474c]/60"
          aria-disabled
        >
          <IconArrowLeft className="size-4" aria-hidden />
        </span>
      ) : (
        <Link
          href={withLeaderboardFilters(buildPath("week", prevWeek), filters)}
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-[#43474c] transition-colors hover:bg-[#e5eeff]"
          aria-label="Previous week"
        >
          <IconArrowLeft className="size-4" aria-hidden />
        </Link>
      )}
      {weeks.map((week) =>
        week.disabled ? (
          <span
            key={week.path}
            className="shrink-0 rounded-full border border-[#E2E8F0] bg-white px-4 py-1 text-[12px] font-semibold leading-4 text-[#43474c]/60"
            aria-disabled
          >
            {week.label}
          </span>
        ) : (
          <Link
            key={week.path}
            href={week.path}
            className={cn(
              "shrink-0 rounded-full border px-4 py-1 text-[12px] font-semibold leading-4 transition-colors",
              week.active
                ? "border-[#0051d5] bg-[#0051d5] text-white"
                : "border-[#E2E8F0] bg-white text-[#43474c] hover:bg-[#e5eeff]",
            )}
          >
            {week.label}
          </Link>
        ),
      )}
      {nextDisabled ? (
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-[#43474c]/60"
          aria-disabled
        >
          <IconArrowRight className="size-4" aria-hidden />
        </span>
      ) : (
        <Link
          href={withLeaderboardFilters(buildPath("week", nextWeek), filters)}
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-[#43474c] transition-colors hover:bg-[#e5eeff]"
          aria-label="Next week"
        >
          <IconArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  )
}

function WeeklyLeaderboardCard({
  item,
  rank,
}: {
  item: LeaderboardCardItem
  rank: number
}) {
  const isTop = rank === 1
  const href = getLeaderboardCardHref(item)
  const redirectLinkProps = getSponsoredRedirectLinkProps(item.sponsored)

  return (
    <article
      className={cn(
        "rounded-xl bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)]",
        isTop ? "border-2 border-black" : "border border-[#E2E8F0]",
      )}
    >
      <div className="flex gap-4 md:gap-6">
        <Link href={href} {...redirectLinkProps} className="shrink-0">
          <ArchiveLogo item={item} />
        </Link>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[18px] font-semibold leading-6 text-black">
                  <Link
                    href={href}
                    {...redirectLinkProps}
                    className="hover:underline"
                  >
                    {item.name}
                  </Link>
                </h3>
                {item.sponsored ? (
                  <span className="rounded bg-[#F97316]/10 px-2 py-0.5 text-[9px] font-extrabold uppercase leading-[10px] text-[#b45309]">
                    Sponsored
                  </span>
                ) : null}
              </div>
              <p className="mt-1 line-clamp-2 text-[14px] leading-5 text-[#43474c]">
                {item.tagline}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-4">
              <span className="text-[12px] font-semibold leading-4 text-[#43474c]">
                #{rank}
              </span>
              <ArchiveUpvoteStat compact />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <CategoryPills item={item} />
            <WeeklyAwardPills rank={rank} />
          </div>
        </div>
      </div>
    </article>
  )
}

function WeeklyCompactRow({
  item,
  rank,
  nowMs,
}: {
  item: LeaderboardCardItem
  rank: number
  nowMs: number
}) {
  const isNewLaunch =
    item.createdAt &&
    nowMs - new Date(item.createdAt).getTime() < 14 * 24 * 60 * 60 * 1000
  const href = getLeaderboardCardHref(item)
  const redirectLinkProps = getSponsoredRedirectLinkProps(item.sponsored)

  return (
    <article
      className={cn(
        "flex items-center justify-between gap-4 rounded-xl bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)]",
        isNewLaunch
          ? "border border-l-4 border-[#E2E8F0] border-l-[#16a34a]"
          : "border border-[#E2E8F0]",
      )}
    >
      <div className="flex min-w-0 items-center gap-4">
        <Link href={href} {...redirectLinkProps} className="shrink-0">
          <ArchiveLogo item={item} size="small" />
        </Link>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[12px] font-semibold leading-4 text-black md:text-[14px] md:leading-5">
              <Link
                href={href}
                {...redirectLinkProps}
                className="hover:underline"
              >
                {item.name}
              </Link>
            </h3>
            {isNewLaunch ? (
              <span className="hidden rounded-full bg-[#dcfce7] px-1.5 py-0.5 text-[9px] font-medium uppercase text-[#166534] sm:inline-flex">
                New Launch
              </span>
            ) : null}
          </div>
          <p className="line-clamp-1 max-w-md text-[14px] leading-5 text-[#43474c]">
            {item.tagline}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 md:gap-4">
        <span className="text-[12px] font-semibold leading-4 text-[#43474c]">
          #{rank}
        </span>
        <ArchiveUpvoteStat compact />
      </div>
    </article>
  )
}

function DailyCalendarStrip({
  dayLinks,
  start,
  filters,
  todayUtc,
}: {
  dayLinks: Array<{
    day: number
    path: string
    active: boolean
    disabled: boolean
  }>
  start: Date
  filters: PeriodicLeaderboardFilters
  todayUtc: Date
}) {
  const prevDay = getAdjacentStart("day", start, -1)
  const nextDay = getAdjacentStart("day", start, 1)
  const prevDisabled = prevDay.getTime() > todayUtc.getTime()
  const nextDisabled = nextDay.getTime() > todayUtc.getTime()

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      {prevDisabled ? (
        <span
          className="flex size-8 shrink-0 items-center justify-center text-[#43474c]/60"
          aria-disabled
        >
          <IconArrowLeft className="size-4" aria-hidden />
        </span>
      ) : (
        <Link
          href={withLeaderboardFilters(buildPath("day", prevDay), filters)}
          className="flex size-8 shrink-0 items-center justify-center text-[#43474c] transition-colors hover:text-black"
          aria-label="Previous day"
        >
          <IconArrowLeft className="size-4" aria-hidden />
        </Link>
      )}
      <div className="flex gap-1">
        {dayLinks.map((entry) =>
          entry.disabled ? (
            <span
              key={entry.day}
              className="flex size-8 shrink-0 items-center justify-center text-[11px] font-medium leading-[14px] text-[#43474c]/50"
              aria-disabled
            >
              {entry.day}
            </span>
          ) : (
            <Link
              key={entry.day}
              href={entry.path}
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-medium leading-[14px] transition-colors",
                entry.active
                  ? "bg-[#0051d5] font-bold text-white"
                  : "text-[#43474c] hover:bg-[#e5eeff]",
              )}
            >
              {entry.day}
            </Link>
          ),
        )}
      </div>
      {nextDisabled ? (
        <span
          className="flex size-8 shrink-0 items-center justify-center text-[#43474c]/60"
          aria-disabled
        >
          <IconArrowRight className="size-4" aria-hidden />
        </span>
      ) : (
        <Link
          href={withLeaderboardFilters(buildPath("day", nextDay), filters)}
          className="flex size-8 shrink-0 items-center justify-center text-[#43474c] transition-colors hover:text-black"
          aria-label="Next day"
        >
          <IconArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  )
}

function DailyAwardPills({
  rank,
  isNewLaunch,
}: {
  rank: number
  isNewLaunch: boolean
}) {
  return (
    <>
      {rank === 1 ? (
        <>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#ffdbca] px-2 py-1 text-[11px] font-medium leading-[14px] text-[#783200]">
            <Trophy className="size-3.5" aria-hidden />
            Product of the Week #3
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#F97316]/10 px-2 py-1 text-[11px] font-medium leading-[14px] text-[#b45309]">
            <Sparkles className="size-3.5" aria-hidden />
            Product of the Day #1
          </span>
        </>
      ) : null}
      {isNewLaunch ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#F97316]/10 px-2 py-1 text-[11px] font-medium leading-[14px] text-[#b45309]">
          <Rocket className="size-3.5" aria-hidden />
          New Launch
        </span>
      ) : null}
    </>
  )
}

function DailyUpvoteStat() {
  return (
    <div className="flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[#346cef]/10 bg-[#EFF6FF] text-[#0051d5] transition-all hover:bg-[#0051d5] hover:text-white">
      <ChevronUp className="size-5" aria-hidden />
    </div>
  )
}

function DailyProductCard({
  item,
  rank,
  nowMs,
}: {
  item: LeaderboardCardItem
  rank: number
  nowMs: number
}) {
  const isNewLaunch =
    item.createdAt &&
    nowMs - new Date(item.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000
  const href = getLeaderboardCardHref(item)
  const redirectLinkProps = getSponsoredRedirectLinkProps(item.sponsored)

  return (
    <article className="flex items-start gap-6 rounded-xl border border-[#E2E8F0] bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
      <Link href={href} {...redirectLinkProps} className="shrink-0">
        <ArchiveLogo item={item} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <h3 className="truncate text-[18px] font-semibold leading-6 text-black">
            <Link
              href={href}
              {...redirectLinkProps}
              className="hover:underline"
            >
              {item.name}
            </Link>
          </h3>
          <span className="text-[12px] font-bold leading-4 text-[#0051d5]">
            #{rank}
          </span>
        </div>
        <p className="mb-4 line-clamp-2 text-[14px] leading-5 text-[#43474c]">
          {item.tagline}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <CategoryPills item={item} />
          <DailyAwardPills rank={rank} isNewLaunch={Boolean(isNewLaunch)} />
        </div>
      </div>
      <DailyUpvoteStat />
    </article>
  )
}

export async function PeriodicLeaderboardView({
  leaderboard,
  categorySlug,
}: {
  leaderboard: PeriodicLeaderboardPayload
  categorySlug?: string | null
}) {
  const archive = leaderboard.archive ?? { months: [], weeks: [] }
  const start = new Date(leaderboard.periodStart)
  const filters: PeriodicLeaderboardFilters = {
    categorySlug,
  }
  const now = new Date()
  const todayUtc = new Date()
  todayUtc.setUTCHours(0, 0, 0, 0)
  const isFutureDate = (date: Date) => date.getTime() > todayUtc.getTime()
  const availableMonthKeys = new Set(
    archive.months.map((entry) => `${entry.year}-${entry.month}`),
  )
  const availableWeekKeys = new Set(
    archive.weeks.map((entry) => `${entry.year}-${entry.week}`),
  )
  const shouldFilterMonths = availableMonthKeys.size > 0
  const shouldFilterWeeks = availableWeekKeys.size > 0
  const priorityPlanIds = await getPriorityPlacementPlanIds()

  const items = leaderboard.products.map((product) => {
    const base = mapProductCardRecordToBase(product, now, {
      priorityPlanIds,
      placementNow: now,
    })
    const productRank = (product as unknown as { leaderboardRank?: unknown })
      .leaderboardRank
    const leaderboardRank =
      typeof productRank === "number" ? productRank : undefined
    return {
      ...base,
      interest: null,
      badges: base.badges ?? undefined,
      leaderboardRank,
    }
  })
  const hasProducts = items.length > 0

  const daysInMonth = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0),
  ).getUTCDate()
  const activeDay = start.getUTCDate()
  const dayLinks =
    leaderboard.period === "day"
      ? Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1
          const disabled = isFutureDate(
            new Date(
              Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), day),
            ),
          )
          return {
            day,
            path: withLeaderboardFilters(
              `/leaderboard/daily/${start.getUTCFullYear()}/${start.getUTCMonth() + 1}/${day}`,
              filters,
            ),
            active: day === activeDay,
            disabled,
          }
        })
      : []

  const shortRangeFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })

  const weeklyFilters =
    leaderboard.period === "week"
      ? [-2, -1, 0, 1, 2]
          .map((delta) => {
            const slotStart = new Date(start)
            slotStart.setUTCDate(start.getUTCDate() + delta * 7)
            const slotEnd = new Date(slotStart)
            slotEnd.setUTCDate(slotStart.getUTCDate() + 6)
            return {
              path: withLeaderboardFilters(
                buildPath("week", slotStart),
                filters,
              ),
              label: `${shortRangeFormatter.format(slotStart)} - ${shortRangeFormatter.format(slotEnd)}`,
              active: delta === 0,
              disabled: isFutureDate(slotStart),
              weekKey: getIsoWeekKey(slotStart),
            }
          })
          .filter(
            (week) =>
              !shouldFilterWeeks ||
              week.active ||
              availableWeekKeys.has(week.weekKey),
          )
          .map((week) => {
            const { weekKey, ...rest } = week
            void weekKey
            return rest
          })
      : []

  const monthArchive: Array<{
    label: string
    displayLabel: string
    path: string
    year: number
    month: number
    active: boolean
  }> = []
  const monthFormatter = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
  const monthOnlyFormatter = new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: "UTC",
  })
  for (let i = 0; i < 12; i++) {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
    )
    const year = date.getUTCFullYear()
    const month = date.getUTCMonth() + 1
    monthArchive.push({
      label: monthFormatter.format(date),
      displayLabel: monthOnlyFormatter.format(date),
      path: withLeaderboardFilters(
        `/leaderboard/monthly/${year}/${month}`,
        filters,
      ),
      year,
      month,
      active:
        year === start.getUTCFullYear() && month === start.getUTCMonth() + 1,
    })
  }

  const filteredMonthArchive = monthArchive.filter((entry) => {
    if (!shouldFilterMonths) return true
    const key = `${entry.year}-${entry.month}`
    return entry.active || availableMonthKeys.has(key)
  })

  const groupedArchive: Array<{
    year: number
    months: Array<(typeof monthArchive)[number]>
  }> = []
  const archiveMap = new Map<number, (typeof groupedArchive)[number]>()
  filteredMonthArchive.forEach((entry) => {
    const group = archiveMap.get(entry.year)
    if (group) {
      group.months.push(entry)
    } else {
      const newGroup = { year: entry.year, months: [entry] }
      archiveMap.set(entry.year, newGroup)
      groupedArchive.push(newGroup)
    }
  })

  const buildSidebarPath = (year: number, month: number) => {
    if (leaderboard.period === "day") {
      const daysInTargetMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
      const day = Math.min(start.getUTCDate(), daysInTargetMonth)
      return withLeaderboardFilters(
        buildPath("day", new Date(Date.UTC(year, month - 1, day))),
        filters,
      )
    }
    if (leaderboard.period === "week") {
      const daysInTargetMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
      const day = Math.min(start.getUTCDate(), daysInTargetMonth)
      const anchor = new Date(Date.UTC(year, month - 1, day))
      const { year: weekYear, week } = getIsoWeekYearAndNumber(anchor)
      return withLeaderboardFilters(
        `/leaderboard/weekly/${weekYear}/${week}`,
        filters,
      )
    }
    return withLeaderboardFilters(
      `/leaderboard/monthly/${year}/${month}`,
      filters,
    )
  }

  const headerTitle =
    leaderboard.period === "day"
      ? `Best of ${start.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
          timeZone: "UTC",
        })}`
      : leaderboard.period === "week"
        ? `Best of the week of ${start.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
            timeZone: "UTC",
          })}`
        : `Best of ${start.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          })}`
  const siteUrl = resolveSiteUrl()
  const pagePath = withLeaderboardFilters(
    buildPath(leaderboard.period, start),
    {
      categorySlug,
    },
  )
  const pageTitle = `${headerTitle} leaderboard`
  const itemListDescription = `Ranked Shipyard product launches for ${leaderboard.periodLabel}.`
  const breadcrumbs = [
    { name: "Home", path: HOME_PATH },
    { name: "Leaderboard", path: LEADERBOARD_PATH },
    ...(leaderboard.period === "month"
      ? [{ name: "Monthly archive", path: LEADERBOARD_MONTHLY_PATH }]
      : []),
    { name: headerTitle, path: pagePath },
  ]
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${siteUrl}${pagePath}#itemlist`,
    name: `${headerTitle} products`,
    description: itemListDescription,
    numberOfItems: items.length,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: items.slice(0, 100).map((product, index) =>
      buildProductListItem({
        product,
        position: product.leaderboardRank ?? index + 1,
        siteUrl,
      }),
    ),
  }
  const itemListScript = (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
    />
  )
  const structuredData = (
    <>
      <CoreStructuredData
        scriptKeyPrefix={`leaderboard-${leaderboard.period}-${start.toISOString().slice(0, 10)}`}
        webPage={{
          path: pagePath,
          name: pageTitle,
          description: itemListDescription,
        }}
        breadcrumbs={{
          items: breadcrumbs,
          options: { pageUrl: pagePath },
        }}
      />
      {itemListScript}
    </>
  )

  if (leaderboard.period === "day") {
    const [categories, useCases, alternatives] = await Promise.all([
      getCategoryHighlights(3),
      getUseCaseHighlights(3),
      getFeaturedAlternatives({ take: 3 }),
    ])
    const rankedItems = items.slice(0, 100)

    return (
      <main className="bg-[#F8FAFC] px-6 pb-16 pt-8 text-[#0b1c30]">
        {structuredData}
        <PublicAdLayout pathname={buildPath(leaderboard.period, start)}>
          <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-6 lg:grid-cols-12">
            <section className="space-y-6 lg:col-span-8">
              <div className="space-y-3">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <h1 className="text-[32px] font-bold leading-10 tracking-[-0.02em] text-black">
                    {headerTitle}
                  </h1>
                  <ArchiveSegmentedNav
                    start={start}
                    filters={filters}
                    activePeriod="day"
                  />
                </div>
                <DailyCalendarStrip
                  dayLinks={dayLinks}
                  start={start}
                  filters={filters}
                  todayUtc={todayUtc}
                />
              </div>
              <h2 className="sr-only">Ranked products</h2>

              {hasProducts ? (
                <div className="space-y-3">
                  {rankedItems.map((item, index) => (
                    <DailyProductCard
                      key={item.id}
                      item={item}
                      rank={item.leaderboardRank ?? index + 1}
                      nowMs={now.getTime()}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-[#E2E8F0] bg-white px-6 py-12 text-center text-[#43474c]">
                  <Rocket className="size-8 text-[#0051d5]" aria-hidden />
                  <div className="space-y-1">
                    <p className="text-[18px] font-semibold leading-6 text-black">
                      No ranked products yet.
                    </p>
                    <p className="text-[14px] leading-5 text-[#43474c]">
                      As soon as products earn points in this window, they will
                      appear here.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button asChild className="rounded-lg bg-black text-white">
                      <Link href={LEADERBOARD_PATH}>View live leaderboard</Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="rounded-lg border-[#E2E8F0] bg-white text-black"
                    >
                      <Link href={BROWSE_PATH}>Browse products</Link>
                    </Button>
                  </div>
                </div>
              )}
            </section>

            <aside className="space-y-6 lg:col-span-4">
              <PeriodicArchiveSidebar
                groups={groupedArchive}
                buildSidebarPath={buildSidebarPath}
                categories={categories}
                useCases={useCases}
                alternatives={alternatives}
              />
            </aside>
          </div>
        </PublicAdLayout>
      </main>
    )
  }

  if (leaderboard.period === "week") {
    const [categories, useCases, alternatives] = await Promise.all([
      getCategoryHighlights(3),
      getUseCaseHighlights(3),
      getFeaturedAlternatives({ take: 3 }),
    ])

    const rankedItems = items.slice(0, 100)
    const featuredItems = rankedItems.slice(0, 3)
    const compactItems = rankedItems.slice(3)

    return (
      <main className="bg-[#F8FAFC] px-6 pb-16 pt-8 text-[#0b1c30]">
        {structuredData}
        <PublicAdLayout pathname={buildPath(leaderboard.period, start)}>
          <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-6 lg:grid-cols-12">
            <section className="space-y-6 lg:col-span-8">
              <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
                <div className="space-y-1">
                  <h1 className="text-[32px] font-bold leading-10 tracking-[-0.02em] text-black">
                    {headerTitle}
                  </h1>
                  <WeeklyRangeNav
                    weeks={weeklyFilters}
                    start={start}
                    filters={filters}
                    todayUtc={todayUtc}
                  />
                </div>
                <ArchiveSegmentedNav
                  start={start}
                  filters={filters}
                  activePeriod="week"
                />
              </div>
              <h2 className="sr-only">Ranked products</h2>

              {hasProducts ? (
                <>
                  <div className="space-y-3">
                    {featuredItems.map((item, index) => (
                      <WeeklyLeaderboardCard
                        key={item.id}
                        item={item}
                        rank={item.leaderboardRank ?? index + 1}
                      />
                    ))}
                  </div>
                  {compactItems.length ? (
                    <div className="space-y-1">
                      {compactItems.map((item, index) => (
                        <WeeklyCompactRow
                          key={item.id}
                          item={item}
                          nowMs={now.getTime()}
                          rank={
                            item.leaderboardRank ??
                            featuredItems.length + index + 1
                          }
                        />
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-[#E2E8F0] bg-white px-6 py-12 text-center text-[#43474c]">
                  <Rocket className="size-8 text-[#0051d5]" aria-hidden />
                  <div className="space-y-1">
                    <p className="text-[18px] font-semibold leading-6 text-black">
                      No ranked products yet.
                    </p>
                    <p className="text-[14px] leading-5 text-[#43474c]">
                      As soon as products earn points in this window, they will
                      appear here.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button asChild className="rounded-lg bg-black text-white">
                      <Link href={LEADERBOARD_PATH}>View live leaderboard</Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="rounded-lg border-[#E2E8F0] bg-white text-black"
                    >
                      <Link href={BROWSE_PATH}>Browse products</Link>
                    </Button>
                  </div>
                </div>
              )}
            </section>

            <aside className="space-y-6 lg:col-span-4">
              <PeriodicArchiveSidebar
                groups={groupedArchive}
                buildSidebarPath={buildSidebarPath}
                categories={categories}
                useCases={useCases}
                alternatives={alternatives}
              />
            </aside>
          </div>
        </PublicAdLayout>
      </main>
    )
  }

  if (leaderboard.period === "month") {
    const [categories, useCases, alternatives, partnerProduct] =
      await Promise.all([
        getCategoryHighlights(3),
        getUseCaseHighlights(3),
        getFeaturedAlternatives({ take: 3 }),
        getPartnerSpotlightProduct(now.toISOString().slice(0, 13)),
      ])

    const rankedItems = items.slice(0, 100)
    const featuredItems = rankedItems.slice(0, 3)
    const compactItems = rankedItems.slice(3)
    const beforePartner = compactItems.slice(0, 2)
    const afterPartner = compactItems.slice(2)

    return (
      <main className="bg-[#F8FAFC] px-6 pb-16 pt-8 text-[#0b1c30]">
        {structuredData}
        <PublicAdLayout pathname={buildPath(leaderboard.period, start)}>
          <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-6 lg:grid-cols-12">
            <section className="lg:col-span-8">
              <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <h1 className="text-[32px] font-bold leading-10 tracking-[-0.02em] text-black">
                    {headerTitle}
                  </h1>
                  <p className="mt-1 text-[14px] leading-5 text-[#43474c]">
                    Hand-picked by the community. Validated by data.
                  </p>
                </div>
                <ArchiveSegmentedNav
                  start={start}
                  filters={filters}
                  activePeriod="month"
                />
              </div>
              <h2 className="sr-only">Ranked products</h2>

              {hasProducts ? (
                <div className="flex flex-col gap-4">
                  {featuredItems.map((item, index) => (
                    <FeaturedArchiveCard
                      key={item.id}
                      item={item}
                      rank={item.leaderboardRank ?? index + 1}
                    />
                  ))}
                  <div className="grid grid-cols-1 gap-3">
                    {beforePartner.map((item, index) => (
                      <CompactArchiveRow
                        key={item.id}
                        item={item}
                        rank={
                          item.leaderboardRank ??
                          featuredItems.length + index + 1
                        }
                      />
                    ))}
                    <InlinePartnerSpotlight product={partnerProduct} />
                    {afterPartner.map((item, index) => (
                      <CompactArchiveRow
                        key={item.id}
                        item={item}
                        rank={
                          item.leaderboardRank ??
                          featuredItems.length +
                            beforePartner.length +
                            index +
                            1
                        }
                      />
                    ))}
                  </div>
                  {items.length > rankedItems.length ? (
                    <div className="mt-4 w-full rounded-xl border-2 border-dashed border-[#E2E8F0] px-4 py-4 text-center text-[12px] font-semibold uppercase leading-4 tracking-[0.05em] text-[#43474c] transition-colors hover:bg-[#e5eeff]">
                      Showing the top {rankedItems.length} rankings for{" "}
                      {leaderboard.periodLabel}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-[#E2E8F0] bg-white px-6 py-12 text-center text-[#43474c]">
                  <Rocket className="size-8 text-[#0051d5]" aria-hidden />
                  <div className="space-y-1">
                    <p className="text-[18px] font-semibold leading-6 text-black">
                      No ranked products yet.
                    </p>
                    <p className="text-[14px] leading-5 text-[#43474c]">
                      As soon as products earn points in this window, they will
                      appear here.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button asChild className="rounded-lg bg-black text-white">
                      <Link href={LEADERBOARD_PATH}>View live leaderboard</Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="rounded-lg border-[#E2E8F0] bg-white text-black"
                    >
                      <Link href={BROWSE_PATH}>Browse products</Link>
                    </Button>
                  </div>
                </div>
              )}
            </section>

            <aside className="flex flex-col gap-6 lg:col-span-4">
              <PeriodicArchiveSidebar
                groups={groupedArchive}
                buildSidebarPath={buildSidebarPath}
                categories={categories}
                useCases={useCases}
                alternatives={alternatives}
              />
            </aside>
          </div>
        </PublicAdLayout>
      </main>
    )
  }

  return null
}
