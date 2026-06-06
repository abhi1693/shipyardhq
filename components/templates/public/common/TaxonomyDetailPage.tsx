import Link from "next/link"
import { Suspense, type ReactNode } from "react"
import { Rocket, Sparkles } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/atoms/avatar"
import {
  TrafficSidebarStats,
  TrafficSidebarStatsSkeleton,
} from "@/components/templates/public/common/TrafficSidebarStats"

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

function sponsoredRedirectPath(slug: string) {
  return `/r/sponsored/${encodeURIComponent(slug)}`
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
  const sponsorProducts = [sponsorProduct, secondarySponsor].filter(
    (product): product is TaxonomySponsorProduct => Boolean(product),
  )

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
          {sponsorProduct ? (
            <section className="flex flex-col gap-4 rounded-lg border border-black/10 bg-black/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <SponsorLogo product={sponsorProduct} size="large" />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-black">
                      {sponsorProduct.name}
                    </h2>
                    <span className="rounded bg-[#f97316]/10 px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#f97316]">
                      Sponsored
                    </span>
                  </div>
                  {sponsorProduct.tagline ? (
                    <p className="text-sm leading-6 text-[#43474c]">
                      {sponsorProduct.tagline}
                    </p>
                  ) : null}
                </div>
              </div>
              <Link
                href={sponsoredRedirectPath(sponsorProduct.slug)}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="shrink-0 text-sm font-semibold text-[#0051d5] hover:underline"
              >
                Learn More
              </Link>
            </section>
          ) : null}

          <section data-testid={feedTestId}>{feed}</section>
        </div>

        <aside className="space-y-6 lg:col-span-4">
          <Suspense fallback={<TrafficSidebarStatsSkeleton />}>
            <TrafficSidebarStats />
          </Suspense>

          {sponsorProducts.length > 0 ? (
            <section className="rounded-lg border border-[#e2e8f0] bg-white p-6">
              <div className="mb-5 flex items-center gap-2">
                <StarIcon />
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black">
                  Sponsors
                </h3>
              </div>
              <div className="space-y-4">
                {sponsorProducts.map((product, index) => (
                  <Link
                    key={product.slug}
                    href={sponsoredRedirectPath(product.slug)}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="flex items-center gap-3 border-b border-[#e2e8f0] pb-4 last:border-b-0 last:pb-0"
                  >
                    <SponsorLogo product={product} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="truncate text-sm font-semibold text-black">
                          {product.name}
                        </h4>
                        {index === 0 ? (
                          <span className="rounded bg-[#f97316]/10 px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#f97316]">
                            Sponsored
                          </span>
                        ) : null}
                      </div>
                      {product.tagline ? (
                        <p className="line-clamp-1 text-xs text-[#43474c]">
                          {product.tagline}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </main>
  )
}

function StarIcon() {
  return <Sparkles className="h-5 w-5 text-[#f97316]" aria-hidden />
}

function SponsorLogo({
  product,
  size = "default",
}: {
  product: TaxonomySponsorProduct
  size?: "default" | "large"
}) {
  const sizeClass = size === "large" ? "h-12 w-12" : "h-12 w-12"

  return (
    <Avatar className={`${sizeClass} shrink-0 rounded-lg bg-black text-white`}>
      {product.logo ? (
        <AvatarImage src={product.logo} alt={`${product.name} logo`} />
      ) : null}
      <AvatarFallback className="rounded-lg bg-black text-sm font-semibold uppercase text-white">
        {getInitials(product.name)}
      </AvatarFallback>
    </Avatar>
  )
}

function getInitials(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2)

  return initials || <Rocket className="h-5 w-5" aria-hidden />
}
