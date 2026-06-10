import Link from "next/link"
import { type ReactNode } from "react"

import { TaxonomySponsorsSidebar } from "@/components/templates/public/common/TaxonomySponsorsSidebar"

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
  logo?: string | null
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
  sponsorProducts?: TaxonomySponsorProduct[]
  sponsorProduct?: TaxonomySponsorProduct | null
  secondarySponsor?: TaxonomySponsorProduct | null
  trafficStats?: ReactNode
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
  sponsorProducts: sponsorProductsProp,
  sponsorProduct,
  secondarySponsor,
  trafficStats,
}: TaxonomyDetailPageProps) {
  const sponsorProducts = (
    sponsorProductsProp?.length
      ? sponsorProductsProp
      : [sponsorProduct, secondarySponsor]
  ).filter((product): product is TaxonomySponsorProduct => Boolean(product))

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
          <section data-testid={feedTestId}>{feed}</section>
        </div>

        <aside className="space-y-6 lg:col-span-4">
          {trafficStats}

          <TaxonomySponsorsSidebar products={sponsorProducts} />
        </aside>
      </div>
    </main>
  )
}
