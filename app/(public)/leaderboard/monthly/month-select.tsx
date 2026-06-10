"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import InlineSelect from "@/components/molecules/InlineSelect"
import {
  currentMonthlyLeaderboardPath,
  monthlyLeaderboardArchivePath,
} from "@/lib/routes"
import type { MonthlyLeaderboardMonth } from "@/actions/public/leaderboard/actions"

const leaderboardSelectTriggerClasses =
  "h-10 w-full sm:w-[220px] rounded-lg border border-border bg-white px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[--ring]"

export function MonthlyLeaderboardMonthSelect({
  months,
  selected,
}: {
  months: MonthlyLeaderboardMonth[]
  selected?: string
}) {
  const router = useRouter()

  const options = useMemo(
    () => months.map((month) => ({ value: month.month, label: month.label })),
    [months],
  )

  if (!options.length) {
    return null
  }

  const fallbackValue = options[0]?.value
  const value =
    selected && options.some((option) => option.value === selected)
      ? selected
      : fallbackValue

  const navigateToMonth = (monthKey?: string) => {
    if (monthKey) {
      router.push(monthlyLeaderboardArchivePath(monthKey))
    } else {
      router.push(currentMonthlyLeaderboardPath())
    }
  }

  return (
    <InlineSelect
      value={value ?? ""}
      onValueChange={(v) => navigateToMonth(v || undefined)}
      options={options}
      placeholder="Select a month"
      triggerClassName={leaderboardSelectTriggerClasses}
      testId="monthly-leaderboard-month-select"
      dropdownTestId="monthly-leaderboard-month-dropdown"
    />
  )
}
