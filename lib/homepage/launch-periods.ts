export const HOMEPAGE_LAUNCH_PERIODS = [
  "recent",
  "lastWeek",
  "thisMonth",
  "previousMonth",
  "thisYear",
] as const

export type HomepageLaunchPeriod = (typeof HOMEPAGE_LAUNCH_PERIODS)[number]

export const HOMEPAGE_WINDOW_PERIOD_ORDER = [
  "lastWeek",
  "thisMonth",
  "previousMonth",
  "thisYear",
] as const satisfies readonly Exclude<HomepageLaunchPeriod, "recent">[]

export function isHomepageLaunchPeriod(
  value: unknown,
): value is HomepageLaunchPeriod {
  return (
    typeof value === "string" &&
    HOMEPAGE_LAUNCH_PERIODS.includes(value as HomepageLaunchPeriod)
  )
}
