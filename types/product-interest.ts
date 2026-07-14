export type ProductInterestSignals = {
  /**
   * Cloudflare page views for the product page in the reporting window.
   */
  pageViews: number

  /**
   * Change in page views versus the previous equivalent reporting window.
   * Expressed as a ratio (e.g. 0.5 === +50%).
   */
  pageViewChangeRatio: number

  /**
   * Cloudflare visitors for the product page in the reporting window.
   */
  visitors: number

  /**
   * Repeat visits when the active analytics provider can supply them.
   */
  repeatVisits: number
}

export type ProductInterestBadgeVariant =
  "default" | "secondary" | "destructive" | "outline" | "success"

export type ProductInterestBadgeSpec = {
  key: string
  label: string
  variant: ProductInterestBadgeVariant
  title?: string
}
