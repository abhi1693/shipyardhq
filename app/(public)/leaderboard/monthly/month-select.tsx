"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import InlineSelect from "@/components/molecules/InlineSelect"
import { leaderboardSelectTriggerClasses } from "@/components/pages/admin/analytics/LeaderboardMonthSelect"
import {
  LEADERBOARD_MONTHLY_PATH,
  monthlyLeaderboardArchivePath,
} from "@/lib/routes"
import type { MonthlyLeaderboardMonth } from "@/actions/public/leaderboard/actions"

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
      router.push(LEADERBOARD_MONTHLY_PATH)
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
