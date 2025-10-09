"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import InlineSelect from "@/components/molecules/InlineSelect"
import { buildQuery } from "@/lib/urlParams"

export const leaderboardSelectTriggerClasses =
  "h-10 w-full sm:w-[220px] rounded-lg border border-border bg-white px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[--ring]"

export function LeaderboardMonthSelect({
  months,
  current,
}: {
  months: Array<{ key: string; label: string }>
  current: string
}) {
  const router = useRouter()
  const pathname = usePathname() ?? ""
  const search = useSearchParams()
  const searchString = search?.toString() ?? ""

  if (!months.length) {
    return null
  }

  const options = months.map((month) => ({
    value: month.key,
    label: month.label,
  }))

  const defaultValue = options[0]?.value ?? current
  const value = options.some((option) => option.value === current)
    ? current
    : defaultValue

  const handleChange = (nextValue: string) => {
    const target = buildQuery(
      pathname,
      searchString,
      nextValue === defaultValue ? { month: undefined } : { month: nextValue },
    )
    router.push(target)
  }

  return (
    <InlineSelect
      value={value}
      onValueChange={handleChange}
      options={options}
      placeholder="Select month"
      triggerClassName={leaderboardSelectTriggerClasses}
    />
  )
}
