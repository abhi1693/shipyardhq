const MONTH_PARAM = /^(\d{2})-(\d{2})-(\d{4})$/

export function normalizeMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

export function getPreviousMonth(reference: Date = new Date()): Date {
  const year = reference.getUTCFullYear()
  const month = reference.getUTCMonth()
  const previousMonth = month === 0 ? 11 : month - 1
  const previousYear = month === 0 ? year - 1 : year
  return new Date(Date.UTC(previousYear, previousMonth, 1))
}

function toMonthEnd(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0))
}

export function parseMonthKey(value?: string): Date | null {
  if (!value) return null
  const match = value.match(MONTH_PARAM)
  if (!match) return null
  const day = Number(match[1])
  const monthIndex = Number(match[2]) - 1
  const year = Number(match[3])
  if (
    !Number.isFinite(day) ||
    !Number.isFinite(monthIndex) ||
    !Number.isFinite(year)
  ) {
    return null
  }
  if (monthIndex < 0 || monthIndex > 11) return null
  const candidate = new Date(Date.UTC(year, monthIndex, day))
  if (candidate.getUTCFullYear() !== year) return null
  if (candidate.getUTCMonth() !== monthIndex) return null
  if (candidate.getUTCDate() !== day) return null
  const monthEnd = toMonthEnd(new Date(Date.UTC(year, monthIndex, 1)))
  if (candidate.getTime() !== monthEnd.getTime()) return null
  return normalizeMonth(candidate)
}

export function toMonthKey(date: Date): string {
  const monthStart = normalizeMonth(date)
  const monthEnd = toMonthEnd(monthStart)
  const day = String(monthEnd.getUTCDate()).padStart(2, "0")
  const month = String(monthEnd.getUTCMonth() + 1).padStart(2, "0")
  const year = monthEnd.getUTCFullYear()
  return `${day}-${month}-${year}`
}
