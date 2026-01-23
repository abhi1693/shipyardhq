"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import { IconCalendar } from "@tabler/icons-react"

type DayLink = {
  day: number
  path: string
  disabled: boolean
}

export function DailyLeaderboardDateSelect({
  year,
  month,
  activeDay,
  dayLinks,
}: {
  year: number
  month: number
  activeDay: number
  dayLinks: DayLink[]
}) {
  const router = useRouter()

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
    [],
  )

  const options = useMemo(
    () =>
      dayLinks.map((entry) => {
        const date = new Date(Date.UTC(year, month - 1, entry.day))
        return {
          value: String(entry.day),
          label: formatter.format(date),
          path: entry.path,
          disabled: entry.disabled,
        }
      }),
    [dayLinks, formatter, month, year],
  )

  const value = String(activeDay)

  return (
    <Select
      value={value}
      onValueChange={(nextValue) => {
        const selected = options.find((option) => option.value === nextValue)
        if (selected && !selected.disabled) {
          router.push(selected.path)
        }
      }}
    >
      <SelectTrigger
        size="sm"
        className="h-8 rounded-full border-border/70 bg-white px-2 text-xs font-semibold shadow-sm"
        aria-label="Select leaderboard day"
        data-testid="daily-leaderboard-date-select"
      >
        <IconCalendar className="h-3.5 w-3.5 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent data-testid="daily-leaderboard-date-dropdown">
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
