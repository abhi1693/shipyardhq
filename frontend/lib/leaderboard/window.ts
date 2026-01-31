export function getCurrentLeaderboardWindow(now: Date = new Date()): {
  periodStart: Date
  periodEnd: Date
} {
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()
  const periodStart = new Date(Date.UTC(year, month, 1))
  const periodEnd = new Date(Date.UTC(year, month + 1, 1))
  return { periodStart, periodEnd }
}
