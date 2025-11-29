import { Suspense } from "react"

import { VerifiedRevenuePageContent } from "@/components/templates/public/verified-revenue/page-content"
import { VerifiedRevenuePageSkeleton } from "@/components/templates/public/verified-revenue/skeleton"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { buildPageMetadata } from "@/lib/metadata"
import { HOME_PATH, VERIFIED_REVENUE_PATH } from "@/lib/routes"
import { siteConfig } from "@/lib/siteConfig"

const PAGE_TITLE = "Verified revenue directory"
const OG_IMAGE_URL = new URL(
  "/opengraph-verified-revenue.png",
  siteConfig.url,
).toString()

export const metadata = buildPageMetadata({
  title: `${PAGE_TITLE} — proof you can trust`,
  description:
    "Explore Shipyard makers with verified revenue pulled directly from their payment providers, ranked in descending order.",
  canonical: VERIFIED_REVENUE_PATH,
  openGraph: {
    url: VERIFIED_REVENUE_PATH,
    images: [
      {
        url: OG_IMAGE_URL,
        alt: "Verified revenue directory preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [OG_IMAGE_URL],
  },
})

export default function VerifiedRevenuePage() {
  return (
    <>
      <CoreStructuredData
        scriptKeyPrefix="verified-revenue"
        webPage={{ path: VERIFIED_REVENUE_PATH, name: PAGE_TITLE }}
        breadcrumbs={{
          items: [
            { name: "Home", path: HOME_PATH },
            { name: PAGE_TITLE, path: VERIFIED_REVENUE_PATH },
          ],
        }}
      />
      <Suspense fallback={<VerifiedRevenuePageSkeleton />}>
        <VerifiedRevenuePageContent />
      </Suspense>
    </>
  )
}
