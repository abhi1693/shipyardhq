import Link from "next/link"
import { Suspense, type ReactNode } from "react"
import {
  BarChart3,
  ExternalLink,
  Megaphone,
  Rocket,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react"

import {
  TrafficSidebarStats,
  TrafficSidebarStatsSkeleton,
} from "@/components/templates/public/common/TrafficSidebarStats"
import { PRICING_PATH, productPath } from "@/lib/routes"

export interface TaxonomyDetailStat {
  label: string
  value: number | string
}

export interface TaxonomyDetailCta {
  href: string
  label: string
}

export interface TaxonomySponsorProduct {
  slug: string
  name: string
  tagline?: string | null
}

interface TaxonomyDetailPageProps {
  title: string
  description: string
  icon: ReactNode
  primaryCta: TaxonomyDetailCta
  secondaryCta: TaxonomyDetailCta
  tertiaryCta: TaxonomyDetailCta
  stats: TaxonomyDetailStat[]
  feed: ReactNode
  feedTestId: string
  structuredData?: ReactNode
  sponsorProduct?: TaxonomySponsorProduct | null
  secondarySponsor?: TaxonomySponsorProduct | null
}

const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
})

function formatMetric(value: number | string) {
  if (typeof value === "number") {
    return compactFormatter.format(value)
  }

  return value
}

export function TaxonomyDetailPage({
  title,
  description,
  icon,
  primaryCta,
  secondaryCta,
  tertiaryCta,
  stats,
  feed,
  feedTestId,
  structuredData,
  sponsorProduct,
  secondarySponsor,
}: TaxonomyDetailPageProps) {
  return (
    <main className="bg-[#f8fafc] text-[#0b1c30]">
      {structuredData}

      <section className="bg-[#061d31] px-4 py-16 text-white md:px-6">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-6 text-center">
          <div className="rounded-lg border border-white/10 bg-white/10 p-3 text-[#c0ff00]">
            {icon}
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
              {title}
            </h1>
            <p className="mx-auto max-w-2xl text-base leading-7 text-[#d0e4ff]/80">
              {description}
            </p>
          </div>
          <div className="flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={primaryCta.href}
              className="inline-flex items-center justify-center rounded-lg bg-[#c0ff00] px-6 py-3 text-sm font-bold text-black transition hover:bg-[#d6ff47] active:scale-95"
            >
              {primaryCta.label}
            </Link>
            <Link
              href={secondaryCta.href}
              className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 active:scale-95"
            >
              {secondaryCta.label}
            </Link>
            <Link
              href={tertiaryCta.href}
              className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 active:scale-95"
            >
              {tertiaryCta.label}
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-8 border-t border-white/10 pt-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold text-[#c0ff00]">
                  {formatMetric(stat.value)}
                </div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#d0e4ff]/70">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-6 px-4 py-12 md:px-6 lg:grid-cols-12">
        <div className="space-y-12 lg:col-span-8">
          <section className="flex flex-col gap-4 rounded-lg border border-black/10 bg-black/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-black text-white">
                <Terminal className="h-6 w-6" aria-hidden />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-black">GitRank</h2>
                  <span className="rounded bg-[#f97316]/10 px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#f97316]">
                    Sponsored
                  </span>
                </div>
                <p className="text-sm leading-6 text-[#43474c]">
                  Turn your GitHub contributions into competitive rankings and
                  momentum scores for developers.
                </p>
              </div>
            </div>
            <Link
              href={PRICING_PATH}
              className="shrink-0 text-sm font-semibold text-[#0051d5] hover:underline"
            >
              Learn More
            </Link>
          </section>

          <section data-testid={feedTestId}>{feed}</section>
        </div>

        <aside className="space-y-6 lg:col-span-4">
          <Suspense fallback={<TrafficSidebarStatsSkeleton />}>
            <TrafficSidebarStats />
          </Suspense>

          <section className="rounded-lg border border-[#e2e8f0] bg-white p-6">
            <div className="mb-5 flex items-center gap-2">
              <StarIcon />
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black">
                Sponsors
              </h3>
            </div>
            <div className="space-y-4">
              <Link
                href={
                  sponsorProduct
                    ? productPath(sponsorProduct.slug)
                    : PRICING_PATH
                }
                className="flex items-center gap-3 border-b border-[#e2e8f0] pb-4"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black text-white">
                  <Rocket className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <h4 className="truncate text-sm font-semibold text-black">
                    {sponsorProduct?.name ?? "ThisVid Downloader"}
                  </h4>
                  <p className="line-clamp-1 text-xs text-[#43474c]">
                    {sponsorProduct?.tagline ?? "Download videos in HD."}
                  </p>
                </div>
              </Link>

              <Link
                href={
                  secondarySponsor
                    ? productPath(secondarySponsor.slug)
                    : PRICING_PATH
                }
                className="flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-[#c4c6cd] bg-[#f8fafc]"
              >
                <div className="flex flex-col items-center gap-2 text-[#74777d]">
                  <BarChart3 className="h-8 w-8" aria-hidden />
                  <span className="text-xs font-semibold">
                    Featured dashboard
                  </span>
                </div>
              </Link>

              <Link
                href={PRICING_PATH}
                className="block rounded-lg bg-[#eff4ff] p-4 text-center transition hover:bg-[#dce9ff]"
              >
                <Megaphone className="mx-auto mb-2 h-8 w-8 text-[#74777d]" />
                <p className="text-sm font-semibold text-black">
                  Advertise here
                </p>
                <p className="text-xs text-[#43474c]">
                  Get your product in front of builders.
                </p>
                <span className="mt-2 inline-flex text-xs font-semibold text-[#0051d5]">
                  Advertise with us
                </span>
              </Link>
            </div>
          </section>

          <section className="rounded-lg bg-[#0051d5] p-6 text-center text-white">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
              <Zap className="h-6 w-6" aria-hidden />
            </div>
            <h3 className="mt-4 text-lg font-semibold leading-tight">
              Take payments with Dodo Payments
            </h3>
            <p className="mt-2 text-xs leading-5 text-white/80">
              The merchant of record designed for SaaS founders. Ship faster
              without tax headaches.
            </p>
            <Link
              href={PRICING_PATH}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-bold text-[#0051d5]"
            >
              Get started
              <ExternalLink className="h-4 w-4" aria-hidden />
            </Link>
          </section>
        </aside>
      </div>
    </main>
  )
}

function StarIcon() {
  return <Sparkles className="h-5 w-5 text-[#f97316]" aria-hidden />
}
