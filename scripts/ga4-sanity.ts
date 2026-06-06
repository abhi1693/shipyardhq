/**
 * GA4 sanity query script (read-only).
 *
 * Usage:
 *   GA4_PROPERTY_ID=123456789 \
 *   SHIPYARD_GA4_SERVICE_ACCOUNT_JSON_BASE64=... \
 *   npx tsx scripts/ga4-sanity.ts
 */

import {
  createGa4DataApiClient,
  getGa4PropertyId,
} from "@/lib/server/analytics/ga4DataApi"

async function main() {
  const client = createGa4DataApiClient()
  const propertyId = getGa4PropertyId()

  const [resp] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: "7daysAgo", endDate: "yesterday" }],
    dimensions: [{ name: "pagePath" }],
    metrics: [{ name: "sessions" }, { name: "screenPageViews" }],
    orderBys: [
      {
        metric: { metricName: "screenPageViews" },
        desc: true,
      },
    ],
    limit: 20,
  })

  const rows = resp.rows ?? []
  console.log("Top pages (last 7d):")
  for (const row of rows) {
    const path = row.dimensionValues?.[0]?.value ?? "(unknown)"
    const sessions = row.metricValues?.[0]?.value ?? "0"
    const views = row.metricValues?.[1]?.value ?? "0"
    console.log(`${path}\tsessions=${sessions}\tviews=${views}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
