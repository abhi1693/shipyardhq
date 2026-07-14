export const ANALYTICS_REPORTING_WINDOW_DAYS = 7

function formatWindowLabel(days: number) {
  return `Last ${days} ${days === 1 ? "day" : "days"}`
}

export const ANALYTICS_REPORTING_WINDOW_LABEL = formatWindowLabel(
  ANALYTICS_REPORTING_WINDOW_DAYS,
)

export const ANALYTICS_REPORTING_WINDOW_SHORT_LABEL = `${ANALYTICS_REPORTING_WINDOW_DAYS}d`

export type AnalyticsReportingWindow = {
  days: number
  start: Date
  end: Date
  startDate: string
  endDate: string
}

const DAY_IN_MS = 24 * 60 * 60 * 1000

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
}

function addUtcDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_IN_MS)
}

function buildWindow(end: Date, days: number): AnalyticsReportingWindow {
  const normalizedDays = Math.max(1, Math.floor(days))
  const normalizedEnd = startOfUtcDay(end)
  const start = addUtcDays(normalizedEnd, -(normalizedDays - 1))

  return {
    days: normalizedDays,
    start,
    end: normalizedEnd,
    startDate: start.toISOString().slice(0, 10),
    endDate: normalizedEnd.toISOString().slice(0, 10),
  }
}

export function getCompletedAnalyticsWindow(
  days = ANALYTICS_REPORTING_WINDOW_DAYS,
  referenceDate = new Date(),
): AnalyticsReportingWindow {
  return buildWindow(addUtcDays(referenceDate, -1), days)
}

export function getAnalyticsReportingWindow(
  referenceDate = new Date(),
): AnalyticsReportingWindow {
  return getCompletedAnalyticsWindow(
    ANALYTICS_REPORTING_WINDOW_DAYS,
    referenceDate,
  )
}

export function getPreviousAnalyticsReportingWindow(
  currentWindow: AnalyticsReportingWindow,
): AnalyticsReportingWindow {
  return buildWindow(addUtcDays(currentWindow.start, -1), currentWindow.days)
}
