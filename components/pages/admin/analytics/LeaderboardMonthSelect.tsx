"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import InlineSelect from "@/components/molecules/InlineSelect"
import { buildQuery } from "@/lib/urlParams"

export function LeaderboardMonthSelect({
  months,
  current,
}: {
  months: Array<{ key: string; label: string }>
  current: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams()

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
      search,
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
      triggerClassName="h-9 w-[220px] rounded-lg border border-[color:var(--brand-1)/0.3] bg-background/85 px-3 text-sm font-medium text-foreground shadow-[0px_18px_46px_-36px_rgba(7,78,134,0.42)]"
    />
  )
}
