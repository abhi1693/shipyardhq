import Link from "next/link"
import { Button } from "@/components/atoms/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Skeleton } from "@/components/atoms/skeleton"
import { ObjectPageLayout } from "@/components/layout/object-view/page-layout"
import AnalyticsFeedbackPrompt from "@/components/molecules/AnalyticsFeedbackPrompt"
import RangeSelector from "@/components/molecules/RangeSelector"
import type { ProductAnalyticsViewProps } from "@/components/pages/ProductAnalyticsView"

type ProductAnalyticsSkeletonProps = {
  product: ProductAnalyticsViewProps["product"]
  basePath: string
  backHref: string
  publicHref?: string
  headingId: string
  headingSlug: string
  accessLevel: ProductAnalyticsViewProps["accessLevel"]
  rangeDays: number
  backLabel?: string
  publicLabel?: string
}

function MetricSkeletonCard() {
  return (
    <Card className="rounded-xl border border-slate-200 bg-white/95 py-4 shadow-sm">
      <CardContent className="space-y-3 px-4 py-0">
        <Skeleton className="h-3 w-24 rounded-full" />
        <div className="flex items-baseline gap-2">
          <Skeleton className="h-7 w-16 rounded-md" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-3 w-32 rounded-full" />
      </CardContent>
    </Card>
  )
}

function BreakdownSkeletonCard() {
  return (
    <Card className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
      <CardHeader className="px-4 pb-0 pt-4">
        <Skeleton className="h-4 w-32 rounded" />
        <Skeleton className="h-3 w-40 rounded" />
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-5 pt-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-28 rounded" />
              <Skeleton className="h-3 w-12 rounded" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function ChartSkeletonCard() {
  return (
    <Card className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
      <CardHeader className="px-4 pb-0 pt-4">
        <Skeleton className="h-4 w-40 rounded" />
        <Skeleton className="h-3 w-32 rounded" />
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-5 pt-4">
        <Skeleton className="h-6 w-28 rounded" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </CardContent>
    </Card>
  )
}

function NarrativeSkeleton() {
  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
            Action playbook
          </span>
          <p className="text-sm text-muted-foreground">
            AI-curated next steps are loading.
          </p>
        </div>
        <RangeSelector className="shrink-0" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3 w-32 rounded" />
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-[85%] rounded-md" />
          </div>
        ))}
      </div>
    </section>
  )
}

export function ProductAnalyticsSkeleton({
  product,
  basePath,
  backHref,
  publicHref,
  headingId,
  headingSlug,
  accessLevel,
  rangeDays,
  backLabel,
  publicLabel,
}: ProductAnalyticsSkeletonProps) {
  const rangeLabel = `Last ${rangeDays} days`
  const resolvedBackLabel = backLabel ?? "Back to product"
  const resolvedPublicLabel = publicLabel ?? "View public page"
  const summaryCount = accessLevel === "advanced" ? 8 : 3
  const topRowExtras =
    accessLevel === "advanced"
      ? [<NarrativeSkeleton key="narrative" />]
      : undefined

  return (
    <ObjectPageLayout
      heading={{
        id: headingId,
        title: `${product.name} — Analytics`,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        slug: headingSlug,
      }}
      overview={[]}
      basePath={basePath}
      topRowExtras={topRowExtras}
      headingActionsLeft={
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-2 rounded-full bg-white/80 px-2 py-1 shadow-sm ring-1 ring-slate-200/70">
            <Button variant="ghost" size="sm" className="h-8 px-3" asChild>
              <Link href={backHref}>{resolvedBackLabel}</Link>
            </Button>
            {publicHref ? (
              <Button variant="ghost" size="sm" className="h-8 px-3" asChild>
                <Link
                  href={publicHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {resolvedPublicLabel}
                </Link>
              </Button>
            ) : null}
          </div>
          <AnalyticsFeedbackPrompt
            className="justify-start"
            storageKey="shipyardhq:feedback-nudge:product-analytics"
            buttonLabel="Share analytics feedback"
            title="Need deeper analytics?"
            description="Tell us which charts or metrics would help you act faster."
            body="Call out missing funnels, filters, or signals you rely on when reporting to your crew."
            primaryLabel="Open feedback form"
            secondaryLabel="Not now"
          />
        </div>
      }
      relationships={
        <div className="space-y-8">
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
                  Performance pulse
                </span>
                <p className="text-sm text-muted-foreground">
                  Engagement signals across your most recent reporting window.
                </p>
                <p className="text-xs text-muted-foreground">{rangeLabel}</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: summaryCount }).map((_, index) => (
                <MetricSkeletonCard key={`metric-${index}`} />
              ))}
            </div>
          </section>
          {accessLevel === "advanced" ? (
            <>
              <section className="space-y-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
                    Audience & acquisition
                  </span>
                </div>
                <div className="grid gap-4 lg:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <BreakdownSkeletonCard key={`acq-${index}`} />
                  ))}
                </div>
              </section>
              <section className="space-y-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
                    Traffic trends
                  </span>
                </div>
                <ChartSkeletonCard />
              </section>
              <section className="space-y-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
                    Geography & devices
                  </span>
                </div>
                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <BreakdownSkeletonCard key={`geo-${index}`} />
                  ))}
                </div>
              </section>
              <section className="space-y-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
                    Conversion insights
                  </span>
                </div>
                <div className="grid gap-4 lg:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <BreakdownSkeletonCard key={`conv-${index}`} />
                  ))}
                </div>
              </section>
            </>
          ) : (
            <>
              <section className="space-y-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
                    Traffic insights
                  </span>
                </div>
                <ChartSkeletonCard />
              </section>
              <Card className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
                <CardHeader className="px-5 pb-2 pt-5">
                  <CardTitle className="text-base text-slate-900">
                    Unlock deeper analytics
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    Upgrade to advanced analytics for loyalty signals, channel
                    mix, and conversion insights tailored to every campaign.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 px-5 pb-6">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton
                      key={`cta-${index}`}
                      className="h-4 w-3/4 rounded"
                    />
                  ))}
                  <Skeleton className="h-9 w-40 rounded-md" />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      }
    />
  )
}
