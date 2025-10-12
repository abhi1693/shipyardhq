export const revalidate = 3600

import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Share2, Sparkles } from "lucide-react"

import CopyButton from "@/components/molecules/CopyButton"
import InteractiveTrendRadar from "@/components/organisms/InteractiveTrendRadar"
import { DirectoryCategoryRail } from "@/components/organisms/directory/CategoryRail"
import { buildPageMetadata } from "@/lib/metadata"
import { siteConfig } from "@/lib/siteConfig"
import { BROWSE_PATH, TRENDS_EMBED_PATH } from "@/lib/routes"
import { launchPrimaryButton, launchSecondaryButton } from "@/lib/ui/buttons"
import { brandGradient, gradientTint } from "@/lib/ui/tints"
import { fetchTrendRadarSnapshot } from "./trend-data"

export const metadata = buildPageMetadata({
  title: "Trend Radar",
  description:
    "Understand which Shipyard categories are heating up. Updated hourly, refreshed weekly, and easy to embed in your own reports.",
})

const numberFormatter = new Intl.NumberFormat("en-US")

export default async function TrendsPage() {
  const { radar, topCategories, stats, generatedAt } =
    await fetchTrendRadarSnapshot(12)

  const updatedLabel = formatDistanceToNow(generatedAt, { addSuffix: true })
  const embedUrl = new URL(TRENDS_EMBED_PATH, siteConfig.url).toString()
  const embedSnippet = `<iframe src="${embedUrl}" title="Shipyard Trend Radar" loading="lazy" style="width:100%;max-width:1080px;height:720px;border:0;border-radius:24px;"></iframe>`

  const momentumLeaders = [...radar.metrics]
    .sort((a, b) => b.normalizedMomentum - a.normalizedMomentum)
    .slice(0, 5)
  const signalLeaders = [...radar.metrics]
    .sort((a, b) => b.normalizedSignal - a.normalizedSignal)
    .slice(0, 5)

  const statHighlights = [
    { label: "Directory listings", value: stats.totalProducts },
    { label: "Builders featured", value: stats.totalCreators },
    { label: "Community upvotes", value: stats.totalUpvotes },
    { label: "Insights generated", value: stats.totalInsights },
  ]

  return (
    <main className="relative isolate bg-white">
      <section
        className={brandGradient(
          "relative isolate overflow-hidden border border-[color:var(--brand-1)/0.2] py-16 text-white shadow-[0px_60px_140px_-60px_rgba(18,66,112,0.7)]",
        )}
      >
        <div className="relative mx-auto flex max-w-[80rem] flex-col gap-8 px-4 text-center md:px-8 md:text-left">
          <span
            className={gradientTint(
              "mx-auto inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.32em] text-white/80 md:mx-0",
            )}
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Weekly Pulse
          </span>
          <div className="space-y-4 md:max-w-3xl">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Shipyard Trend Radar
            </h1>
            <p className="text-lg text-white/85">
              Watch product categories heat up in real time. We blend launch
              velocity, directory depth, and upvote signal to surface where the
              Shipyard community is pointing next.
            </p>
          </div>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:justify-start sm:text-left">
            <Link
              href={BROWSE_PATH}
              className={launchPrimaryButton({ size: "lg" })}
            >
              Explore launches
            </Link>
            <Link
              href={TRENDS_EMBED_PATH}
              className={launchSecondaryButton({
                size: "lg",
                className: "text-white/90 hover:text-white",
              })}
            >
              Preview embed
            </Link>
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/70">
            Refreshed {updatedLabel} · Auto-refreshes hourly
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[84rem] px-4 pb-24 pt-12 md:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
          <div className="space-y-8">
            {radar.metrics.length > 0 ? (
              <InteractiveTrendRadar
                categories={radar.metrics}
                totals={radar.totals}
                className="shadow-[0_30px_80px_-60px_rgba(15,43,72,0.45)]"
              />
            ) : (
              <div className="rounded-3xl border border-border bg-white px-6 py-12 text-center text-sm text-muted-foreground shadow-sm">
                No trend data yet—check back after the next wave of launches.
              </div>
            )}

            <section className="grid gap-6 rounded-3xl border border-border bg-white p-6 shadow-sm md:grid-cols-2">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Momentum leaders
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Categories with the most launch energy right now.
                </p>
                <ul className="mt-4 space-y-3">
                  {momentumLeaders.map((category) => (
                    <li
                      key={`${category.id}-momentum`}
                      className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3 text-sm"
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">
                          {category.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {numberFormatter.format(category.trendingCount)}{" "}
                          trending launches ·{" "}
                          {numberFormatter.format(category.productCount)} listed
                        </span>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-1)]">
                        {category.normalizedMomentum}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Signal standouts
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Where the community is delivering the strongest upvote signal.
                </p>
                <ul className="mt-4 space-y-3">
                  {signalLeaders.map((category) => (
                    <li
                      key={`${category.id}-signal`}
                      className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3 text-sm"
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">
                          {category.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {numberFormatter.format(category.trendingUpvotes)}{" "}
                          upvotes this week ·{" "}
                          {category.upvotesPerLaunch.toFixed(1)} per launch
                        </span>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-2,#0ea5e9)]">
                        {category.normalizedSignal}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    Embed the radar
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Drop a live Shipyard pulse into newsletters, investor docs,
                    or internal dashboards.
                  </p>
                </div>
                <CopyButton
                  text={embedSnippet}
                  size="sm"
                  variant="secondary"
                  className="h-9 px-4"
                >
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                  Copy embed iframe
                </CopyButton>
              </div>
              <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-900 px-4 py-3 text-xs text-slate-100">
                <code>{embedSnippet}</code>
              </pre>
            </section>
          </div>
          <aside className="flex flex-col gap-6">
            <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-foreground">
                Shipyard at a glance
              </h2>
              <ul className="mt-4 space-y-3">
                {statHighlights.map((stat) => (
                  <li
                    key={stat.label}
                    className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3 text-sm"
                  >
                    <span className="text-muted-foreground">{stat.label}</span>
                    <span className="font-semibold text-foreground">
                      {numberFormatter.format(stat.value)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <DirectoryCategoryRail categories={topCategories} />
          </aside>
        </div>
      </div>
    </main>
  )
}
