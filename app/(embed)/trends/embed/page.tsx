export const revalidate = 3600

import type { Metadata } from "next"
import Link from "next/link"

import InteractiveTrendRadar from "@/components/organisms/InteractiveTrendRadar"
import { buildPageMetadata } from "@/lib/metadata"
import { siteConfig } from "@/lib/siteConfig"
import { TRENDS_PATH } from "@/lib/routes"
import { recordTrendRadarEmbedView } from "@/lib/server/trendRadar/telemetry"
import { fetchTrendRadarSnapshot } from "@/app/(public)/trends/trend-data"

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "Trend Radar Embed",
    description:
      "Live snapshot of the Shipyard Trend Radar—drop it into your reports or dashboards.",
  }),
  robots: {
    index: false,
    follow: false,
  },
}

export default async function TrendsEmbedPage() {
  const { radar } = await fetchTrendRadarSnapshot(12)
  const trendsUrl = new URL(TRENDS_PATH, siteConfig.url).toString()
  const trendsLabel = trendsUrl.replace(/^https?:\/\//, "")

  void recordTrendRadarEmbedView()

  if (!radar.metrics.length) {
    return (
      <main className="flex min-h-[360px] w-full items-center justify-center bg-white px-4 py-8">
        <p className="max-w-sm text-center text-sm text-muted-foreground">
          The Shipyard Trend Radar will refresh once new launches roll in. Visit{" "}
          <Link
            href={trendsUrl}
            className="font-medium text-[color:var(--brand-1)]"
            target="_blank"
            rel="noreferrer"
          >
            {trendsLabel}
          </Link>{" "}
          to see the full experience.
        </p>
      </main>
    )
  }

  return (
    <main className="min-h-[420px] w-full bg-white px-4 py-6">
      <div className="mx-auto w-full max-w-4xl">
        <InteractiveTrendRadar
          categories={radar.metrics}
          totals={radar.totals}
          className="border border-border bg-white shadow-sm"
          autoRotate
          autoRotateIntervalMs={5000}
        />
      </div>
    </main>
  )
}
