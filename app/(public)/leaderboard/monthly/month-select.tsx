"use client"

import { useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import InlineSelect from "@/components/molecules/InlineSelect"
import { buildQuery } from "@/lib/urlParams"
import { LEADERBOARD_MONTHLY_PATH } from "@/lib/routes"
import type { MonthlyLeaderboardMonth } from "@/actions/public/leaderboard/actions"

export function MonthlyLeaderboardMonthSelect({
  months,
  selected,
}: {
  months: MonthlyLeaderboardMonth[]
  selected?: string
}) {
  const router = useRouter()
  const search = useSearchParams()

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

  const updateQuery = (updates: Record<string, string | undefined>) => {
    router.push(
      buildQuery(LEADERBOARD_MONTHLY_PATH, search?.toString() ?? "", updates),
    )
  }

  return (
    <InlineSelect
      value={value ?? ""}
      onValueChange={(v) => updateQuery({ month: v })}
      options={options}
      placeholder="Select a month"
      triggerClassName="h-9 w-[220px] rounded-lg border border-[color:var(--brand-1)/0.35] bg-background/90 px-3 text-sm font-medium text-foreground shadow-[0px_14px_36px_-28px_rgba(7,58,104,0.55)] transition-colors hover:border-[color:var(--brand-1)/0.55]"
      testId="monthly-leaderboard-month-select"
      dropdownTestId="monthly-leaderboard-month-dropdown"
    />
  )
}
