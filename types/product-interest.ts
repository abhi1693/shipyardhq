export type ProductInterestSignals = {
  /**
   * GA page views for the product page in the last 7 days.
   * Used as a proxy for "clicks" (proof of intent to view).
   */
  clicks7d: number

  /**
   * Week-over-week change in clicks for the last 7 days vs prior 7 days.
   * Expressed as a ratio (e.g. 0.5 === +50%).
   */
  clickVelocityWoW: number

  /**
   * Unique visitors for the product page in the last 7 days.
   */
  uniqueVisitors7d: number

  /**
   * Repeat visits in the last 7 days (sessions - unique visitors).
   */
  repeatVisits7d: number
}

export type ProductInterestBadgeVariant =
  "default" | "secondary" | "destructive" | "outline" | "success"

export type ProductInterestBadgeSpec = {
  key: string
  label: string
  variant: ProductInterestBadgeVariant
  title?: string
}
