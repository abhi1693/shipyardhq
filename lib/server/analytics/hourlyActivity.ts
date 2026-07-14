import type { SiteAnalyticsSnapshot } from "@/lib/server/analytics/providerTypes"

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const

type HourlyActivityRow = {
  timestamp: Date
  requests: number
  visits: number
}

export function parseUtcHour(value?: string | null): Date | null {
  if (!value) return null
  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) return null

  timestamp.setUTCMinutes(0, 0, 0)
  return timestamp
}

export function buildHourlyActivity(
  rows: HourlyActivityRow[],
): SiteAnalyticsSnapshot["hourlyActivity"] {
  const values = new Map<string, { requests: number; visits: number }>()

  for (const row of rows) {
    const weekday = (row.timestamp.getUTCDay() + 6) % 7
    const hour = row.timestamp.getUTCHours()
    const key = `${weekday}:${hour}`
    const current = values.get(key) ?? { requests: 0, visits: 0 }
    current.requests += Math.max(0, row.requests)
    current.visits += Math.max(0, row.visits)
    values.set(key, current)
  }

  return WEEKDAYS.flatMap((weekdayLabel, weekday) =>
    Array.from({ length: 24 }, (_, hour) => {
      const value = values.get(`${weekday}:${hour}`)
      return {
        weekday,
        weekdayLabel,
        hour,
        requests: value?.requests ?? 0,
        visits: value?.visits ?? 0,
      }
    }),
  )
}
