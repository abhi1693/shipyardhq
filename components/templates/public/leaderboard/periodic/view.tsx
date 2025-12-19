import Link from "next/link"
import { Suspense } from "react"

import type { PeriodicLeaderboardPayload } from "@/actions/public/leaderboard/actions"
import { Button } from "@/components/atoms/button"
import PublicTwoColumnLayout from "@/components/layout/public/PublicTwoColumnLayout"
import {
  DirectoryHighlightsSidebar,
  DirectoryHighlightsSidebarSkeleton,
} from "@/components/templates/public/homepage/directory-highlights"
import { DirectoryProductList } from "@/components/organisms/directory/DirectoryProductList"
import { mapProductCardRecordToBase } from "@/lib/products/selects"
import { BROWSE_PATH, LEADERBOARD_PATH } from "@/lib/routes"
import { getProductInterestSignalsMap } from "@/lib/server/analytics/productInterest"
import {
  getIsoWeekKey,
  getIsoWeekYearAndNumber,
} from "@/lib/server/leaderboard/weeks"
import {
  IconArrowLeft,
  IconArrowRight,
  IconSparkles,
} from "@tabler/icons-react"
import { DailyLeaderboardDateSelect } from "./daily-date-select"

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
  verifiedRevenueOnly: boolean
  categorySlug?: string | null
}

function withLeaderboardFilters(
  path: string,
  filters: PeriodicLeaderboardFilters,
): string {
  const [basePath, existingQuery] = path.split("?")
  const params = new URLSearchParams(existingQuery ?? "")

  if (filters.verifiedRevenueOnly) {
    params.set("revenue", "verified")
  } else {
    params.delete("revenue")
  }

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

export async function PeriodicLeaderboardView({
  leaderboard,
  verifiedRevenueOnly = false,
  categorySlug,
}: {
  leaderboard: PeriodicLeaderboardPayload
  verifiedRevenueOnly?: boolean
  categorySlug?: string | null
}) {
  const archive = leaderboard.archive ?? { months: [], weeks: [] }
  const start = new Date(leaderboard.periodStart)
  const basePath = buildPath(leaderboard.period, start)
  const filters: PeriodicLeaderboardFilters = {
    verifiedRevenueOnly,
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

  const interestMap = await getProductInterestSignalsMap({
    products: leaderboard.products.map((product) => ({
      id: product.id,
      slug: product.slug,
    })),
  })

  const items = leaderboard.products.map((product) => {
    const base = mapProductCardRecordToBase(product, now)
    return {
      ...base,
      interest: interestMap.get(base.id) ?? null,
      badges: base.badges ?? undefined,
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

  return (
    <main className="relative isolate bg-[#f5f7fb]">
      <PublicTwoColumnLayout
        className="pb-16 pt-10"
        mainClassName="gap-6"
        sidebarClassName="gap-6"
        main={
          <>
            <section className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-white px-4 py-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  {leaderboard.period === "day" ? (
                    <h1 className="text-2xl font-semibold text-foreground">
                      <span className="hidden sm:inline">{headerTitle}</span>
                      <span className="inline-flex items-center gap-2 sm:hidden">
                        Best of
                        <DailyLeaderboardDateSelect
                          year={start.getUTCFullYear()}
                          month={start.getUTCMonth() + 1}
                          activeDay={activeDay}
                          dayLinks={dayLinks}
                        />
                      </span>
                    </h1>
                  ) : (
                    <h1 className="text-2xl font-semibold text-foreground">
                      {headerTitle}
                    </h1>
                  )}
                </div>
                <div className="inline-flex w-fit rounded-full border border-border/70 bg-white shadow-sm">
                  <Link
                    href={withLeaderboardFilters(
                      buildPath("day", start),
                      filters,
                    )}
                    className={`border-r border-border/50 px-4 py-2 text-sm font-semibold transition first:rounded-l-[15px] last:rounded-r-[15px] ${
                      leaderboard.period === "day"
                        ? "bg-[color:var(--brand-1)] text-white"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    Daily
                  </Link>
                  <Link
                    href={withLeaderboardFilters(
                      buildPath("week", start),
                      filters,
                    )}
                    className={`border-r border-border/50 px-4 py-2 text-sm font-semibold transition first:rounded-l-[15px] last:rounded-r-[15px] ${
                      leaderboard.period === "week"
                        ? "bg-[color:var(--brand-1)] text-white"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    Weekly
                  </Link>
                  <Link
                    href={withLeaderboardFilters(
                      buildPath("month", start),
                      filters,
                    )}
                    className={`px-4 py-2 text-sm font-semibold transition first:rounded-l-[15px] last:rounded-r-[15px] ${
                      leaderboard.period === "month"
                        ? "bg-[color:var(--brand-1)] text-white"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    Monthly
                  </Link>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={withLeaderboardFilters(basePath, {
                    verifiedRevenueOnly: false,
                    categorySlug: filters.categorySlug,
                  })}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    !verifiedRevenueOnly
                      ? "border-[color:var(--brand-1)] bg-[color:var(--brand-1)] text-white"
                      : "border-border/70 bg-white text-[#1C2333] hover:border-[color:var(--brand-1)]/60 hover:bg-[color:var(--brand-1)/0.06] hover:text-[color:var(--brand-1)]"
                  }`}
                  scroll={false}
                >
                  All products
                </Link>
                <Link
                  href={withLeaderboardFilters(basePath, {
                    verifiedRevenueOnly: true,
                    categorySlug: filters.categorySlug,
                  })}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    verifiedRevenueOnly
                      ? "border-[color:var(--brand-1)] bg-[color:var(--brand-1)] text-white"
                      : "border-border/70 bg-white text-[#1C2333] hover:border-[color:var(--brand-1)]/60 hover:bg-[color:var(--brand-1)/0.06] hover:text-[color:var(--brand-1)]"
                  }`}
                  scroll={false}
                >
                  Revenue verified only
                </Link>
              </div>

              {leaderboard.period === "day" ? (
                <div className="mt-1 hidden items-center gap-0.5 sm:flex">
                  {(() => {
                    const prevDay = getAdjacentStart("day", start, -1)
                    const prevDisabled = isFutureDate(prevDay)
                    const prevIcon = <IconArrowLeft className="h-3 w-3" />
                    if (prevDisabled) {
                      return (
                        <span
                          className="inline-flex shrink-0 items-center justify-center rounded-full px-1 py-[2px] text-[10px] font-semibold text-muted-foreground/70"
                          aria-label="Previous day"
                          aria-disabled
                        >
                          {prevIcon}
                        </span>
                      )
                    }
                    return (
                      <Link
                        href={withLeaderboardFilters(
                          buildPath("day", prevDay),
                          filters,
                        )}
                        className="inline-flex shrink-0 items-center justify-center rounded-full px-1 py-[2px] text-[10px] font-semibold text-muted-foreground hover:bg-muted"
                        aria-label="Previous day"
                      >
                        {prevIcon}
                      </Link>
                    )
                  })()}
                  <div className="flex flex-nowrap items-center gap-0.5">
                    {dayLinks.map((entry) =>
                      entry.disabled ? (
                        <span
                          key={entry.day}
                          className="inline-flex min-w-[1.5rem] shrink-0 items-center justify-center rounded-full px-1.5 py-[3px] text-[10px] font-semibold leading-[1.1] text-muted-foreground"
                          aria-disabled
                        >
                          {entry.day}
                        </span>
                      ) : (
                        <Link
                          key={entry.day}
                          href={entry.path}
                          className={`inline-flex min-w-[1.5rem] shrink-0 items-center justify-center rounded-full px-1.5 py-[3px] text-[10px] font-semibold leading-[1.1] transition ${
                            entry.active
                              ? "bg-[color:var(--brand-1)] text-white"
                              : "text-foreground hover:bg-muted"
                          }`}
                        >
                          {entry.day}
                        </Link>
                      ),
                    )}
                  </div>
                  {(() => {
                    const nextDay = getAdjacentStart("day", start, 1)
                    const nextDisabled = isFutureDate(nextDay)
                    const nextIcon = <IconArrowRight className="h-3 w-3" />
                    if (nextDisabled) {
                      return (
                        <span
                          className="inline-flex shrink-0 items-center justify-center rounded-full px-1 py-[2px] text-[10px] font-semibold text-muted-foreground/70"
                          aria-label="Next day"
                          aria-disabled
                        >
                          {nextIcon}
                        </span>
                      )
                    }
                    return (
                      <Link
                        href={withLeaderboardFilters(
                          buildPath("day", nextDay),
                          filters,
                        )}
                        className="inline-flex shrink-0 items-center justify-center rounded-full px-1 py-[2px] text-[10px] font-semibold text-muted-foreground hover:bg-muted"
                        aria-label="Next day"
                      >
                        {nextIcon}
                      </Link>
                    )
                  })()}
                </div>
              ) : null}

              {leaderboard.period === "week" ? (
                <div className="mt-1 flex items-center gap-1">
                  {(() => {
                    const prevWeek = getAdjacentStart("week", start, -1)
                    const prevDisabled = prevWeek.getTime() > todayUtc.getTime()
                    const icon = <IconArrowLeft className="h-4 w-4" />
                    if (prevDisabled) {
                      return (
                        <span className="inline-flex shrink-0 items-center justify-center rounded-full border border-border/70 px-2 py-1 text-xs font-semibold text-muted-foreground/60">
                          {icon}
                        </span>
                      )
                    }
                    return (
                      <Link
                        href={withLeaderboardFilters(
                          buildPath("week", prevWeek),
                          filters,
                        )}
                        className="inline-flex shrink-0 items-center justify-center rounded-full border border-border/70 px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted"
                        aria-label="Previous week"
                      >
                        {icon}
                      </Link>
                    )
                  })()}
                  <div className="grid w-full grid-cols-1 gap-1 sm:grid-cols-3 lg:grid-cols-5">
                    {weeklyFilters.map((week) =>
                      week.disabled ? (
                        <span
                          key={week.path}
                          className="inline-flex w-full items-center justify-center rounded-full border border-border/70 px-3 py-2 text-xs font-semibold text-muted-foreground"
                          aria-disabled
                        >
                          {week.label}
                        </span>
                      ) : (
                        <Link
                          key={week.path}
                          href={week.path}
                          className={`inline-flex w-full items-center justify-center rounded-full border px-3 py-2 text-xs font-semibold transition ${
                            week.active
                              ? "border-[color:var(--brand-1)] bg-[color:var(--brand-1)] text-white"
                              : "border-border/70 text-foreground hover:bg-muted"
                          }`}
                        >
                          {week.label}
                        </Link>
                      ),
                    )}
                  </div>
                  {(() => {
                    const nextWeek = getAdjacentStart("week", start, 1)
                    const nextDisabled = nextWeek.getTime() > todayUtc.getTime()
                    const icon = <IconArrowRight className="h-4 w-4" />
                    if (nextDisabled) {
                      return (
                        <span className="inline-flex shrink-0 items-center justify-center rounded-full border border-border/70 px-2 py-1 text-xs font-semibold text-muted-foreground/60">
                          {icon}
                        </span>
                      )
                    }
                    return (
                      <Link
                        href={withLeaderboardFilters(
                          buildPath("week", nextWeek),
                          filters,
                        )}
                        className="inline-flex shrink-0 items-center justify-center rounded-full border border-border/70 px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted"
                        aria-label="Next week"
                      >
                        {icon}
                      </Link>
                    )
                  })()}
                </div>
              ) : null}
            </section>

            {hasProducts ? (
              <DirectoryProductList
                items={items}
                columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                metaConfig={{
                  type: "rank",
                  badgeClassName:
                    "border-[color:var(--brand-1)/0.28] bg-[color:var(--brand-1)/0.12] text-[color:var(--brand-1)]",
                }}
              />
            ) : (
              <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border/60 bg-white px-6 py-12 text-center text-muted-foreground">
                <IconSparkles className="h-7 w-7 text-[color:var(--brand-1)]" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    No ranked products yet.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    As soon as products earn points in this window, they will
                    appear here.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button asChild size="sm">
                    <Link href={LEADERBOARD_PATH}>View live leaderboard</Link>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="border-border/70 text-muted-foreground hover:text-foreground"
                  >
                    <Link href={BROWSE_PATH}>Browse products</Link>
                  </Button>
                </div>
              </div>
            )}
          </>
        }
        sidebar={
          <>
            <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-white px-4 py-4 shadow-sm">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Monthly archive
              </div>
              <div className="space-y-4 text-sm text-foreground">
                {groupedArchive.map((group) => (
                  <div key={group.year} className="space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      {group.year}
                    </div>
                    <ul className="space-y-1.5">
                      {group.months.map((month) => (
                        <li key={month.path}>
                          <Link
                            href={buildSidebarPath(month.year, month.month)}
                            className={`flex items-center justify-between rounded-lg px-2 py-2 transition ${
                              month.active
                                ? "bg-[color:var(--brand-1)/0.1] text-[color:var(--brand-1)]"
                                : "hover:bg-muted/60"
                            }`}
                          >
                            <span>{month.displayLabel}</span>
                            <IconArrowRight
                              className={`h-4 w-4 ${
                                month.active
                                  ? "text-[color:var(--brand-1)]"
                                  : "text-muted-foreground"
                              }`}
                            />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
            <Suspense fallback={<DirectoryHighlightsSidebarSkeleton />}>
              <DirectoryHighlightsSidebar />
            </Suspense>
          </>
        }
      />
    </main>
  )
}
