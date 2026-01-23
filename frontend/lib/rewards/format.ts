import { formatDistanceToNow } from "date-fns"

const numberFormatter = new Intl.NumberFormat("en-US")

export function formatNumber(value: number) {
  return numberFormatter.format(value)
}

export function formatRewards(value: number) {
  return `${formatNumber(value)} rewards`
}

export function formatLaunches(count: number) {
  if (count === 1) return "1 launch shipped"
  return `${formatNumber(count)} launches shipped`
}

export function formatRelativeRewardsTime(date: Date | null) {
  if (!date) return null
  return formatDistanceToNow(date, { addSuffix: true })
}
