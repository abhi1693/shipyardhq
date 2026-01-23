const DAY_MS = 86_400_000

export function getIsoWeekYearAndNumber(date: Date): {
  year: number
  week: number
} {
  const target = new Date(date.valueOf())
  target.setUTCHours(0, 0, 0, 0)
  target.setUTCDate(target.getUTCDate() + 3 - ((target.getUTCDay() + 6) % 7))
  const week1 = new Date(Date.UTC(target.getUTCFullYear(), 0, 4))
  const weekNumber =
    1 +
    Math.round(
      ((target.getTime() - week1.getTime()) / DAY_MS -
        3 +
        ((week1.getUTCDay() + 6) % 7)) /
        7,
    )
  return { year: target.getUTCFullYear(), week: weekNumber }
}

export function getIsoWeekKey(date: Date): string {
  const { year, week } = getIsoWeekYearAndNumber(date)
  return `${year}-${week}`
}
