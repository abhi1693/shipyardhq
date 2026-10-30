export type ApprovedLaunchResult = {
  productName: string
  productSlug: string
  planName: string
  makerName: string
  publicApproval: boolean
  evidenceUrl: string
  asOf: string
  lifetimeWebsiteClicks: number
}

// TODO: Add only real maker-approved records with a public evidence link and
// verified counting dates. No quotes, names, plans or outcomes are invented.
// Lifetime click aggregates cannot support a "first week" or unique-human claim.
export const LAUNCH_RESULTS: readonly ApprovedLaunchResult[] = []

export function getApprovedLaunchResults(records = LAUNCH_RESULTS) {
  return records.filter((record) => {
    if (
      !record.publicApproval ||
      !record.productName.trim() ||
      !record.productSlug.trim() ||
      !record.makerName.trim() ||
      !record.planName.trim()
    )
      return false
    if (
      !Number.isSafeInteger(record.lifetimeWebsiteClicks) ||
      record.lifetimeWebsiteClicks < 0 ||
      !Number.isFinite(Date.parse(record.asOf))
    )
      return false
    try {
      const url = new URL(record.evidenceUrl)
      return url.protocol === "https:" && !url.username && !url.password
    } catch {
      return false
    }
  })
}
