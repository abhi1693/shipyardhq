"use client"

import Image from "next/image"
import Link from "next/link"
import { useMemo } from "react"
import { ArrowUp, ImageIcon, Sparkles, TrendingUp } from "lucide-react"
import { format, isToday, isYesterday, startOfWeek } from "date-fns"

import type { HomepageFeedItem } from "@/actions/public/homepage/feed"
import { categoryPath, productPath } from "@/lib/routes"

export type TaxonomyProductSection = {
  key: string
  title: string
  dateLabel: string
  products: HomepageFeedItem[]
}

function productDate(product: HomepageFeedItem) {
  const raw = product.publishedAt ?? product.createdAt
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? new Date(0) : date
}

export function buildTaxonomyProductSections(
  products: HomepageFeedItem[],
  referenceDateIso: string,
): TaxonomyProductSection[] {
  const referenceDate = new Date(referenceDateIso)
  const weekStart = startOfWeek(
    Number.isNaN(referenceDate.getTime()) ? new Date() : referenceDate,
  )

  const sections = new Map<string, TaxonomyProductSection>()

  for (const product of products) {
    const date = productDate(product)
    let key = "earlier"
    let title = "Recent launches"

    if (isToday(date)) {
      key = "today"
      title = "Published Today"
    } else if (isYesterday(date)) {
      key = "yesterday"
      title = "Published Yesterday"
    } else if (date >= weekStart) {
      key = "week"
      title = "Published This Week"
    }

    const fallbackDateLabel = Number.isNaN(date.getTime())
      ? "Latest"
      : format(date, "MMM d, yyyy")

    const current = sections.get(key)
    if (current) {
      current.products.push(product)
    } else {
      sections.set(key, {
        key,
        title,
        dateLabel: fallbackDateLabel,
        products: [product],
      })
    }
  }

  return ["today", "yesterday", "week", "earlier"]
    .map((key) => sections.get(key))
    .filter((section): section is TaxonomyProductSection => Boolean(section))
}

function ProductLogo({ product }: { product: HomepageFeedItem }) {
  if (!product.logo) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#eff4ff] text-[#74777d]">
        <ImageIcon className="h-6 w-6" aria-hidden />
      </div>
    )
  }

  return (
    <Image
      src={product.logo}
      alt={`${product.name} logo`}
      fill
      sizes="56px"
      className="object-cover"
    />
  )
}

export function TaxonomyProductRow({ product }: { product: HomepageFeedItem }) {
  const href = productPath(product.slug)
  const momentum = product.scoreCount
    ? Math.max(1, Math.round(product.scoreCount / 10))
    : null

  return (
    <article className="group flex items-center gap-4 rounded-lg border border-[#e2e8f0] bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
      <Link
        href={href}
        className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#eff4ff]"
      >
        <ProductLogo product={product} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={href}
          className="block truncate text-lg font-semibold text-black transition group-hover:text-[#0051d5]"
        >
          {product.name}
        </Link>
        <p className="line-clamp-1 text-sm text-[#43474c]">{product.tagline}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {product.categorySlug ? (
            <Link
              href={categoryPath(product.categorySlug)}
              className="rounded bg-[#f8fafc] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#43474c] transition hover:bg-[#0051d5]/10 hover:text-[#0051d5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0051d5] focus-visible:ring-offset-2"
            >
              {product.category ?? "Product"}
            </Link>
          ) : (
            <span className="rounded bg-[#f8fafc] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#43474c]">
              {product.category ?? "Product"}
            </span>
          )}
          {product.isSponsored || product.badges.length > 0 ? (
            <span className="inline-flex items-center gap-1 rounded bg-[#f97316]/10 px-2 py-1 text-[11px] font-semibold text-[#f97316]">
              <Sparkles className="h-3 w-3" aria-hidden />
              New launch
            </span>
          ) : momentum ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16a34a]">
              <TrendingUp className="h-3 w-3" aria-hidden />+{momentum}%
              momentum
            </span>
          ) : null}
        </div>
      </div>
      <Link
        href={href}
        className="flex shrink-0 cursor-pointer flex-col items-center gap-1 rounded-lg bg-[#eff6ff] px-4 py-2 text-[#0051d5] transition hover:bg-[#0051d5] hover:text-white active:scale-95"
        aria-label={`View ${product.name}`}
      >
        <ArrowUp className="h-5 w-5" aria-hidden />
        <span className="text-sm font-bold leading-none">
          {product.upvoteCount.toLocaleString("en-US")}
        </span>
      </Link>
    </article>
  )
}

export function TaxonomyProductSections({
  sections,
}: {
  sections: TaxonomyProductSection[]
}) {
  return (
    <div className="space-y-12">
      {sections.map((section) => (
        <section key={section.key} className="space-y-3">
          <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-4">
            <h2 className="text-2xl font-semibold tracking-tight text-black">
              {section.title}
            </h2>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#43474c]">
              {section.dateLabel}
            </span>
          </div>
          <div className="space-y-3">
            {section.products.map((product) => (
              <TaxonomyProductRow key={product.id} product={product} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export function TaxonomyHomepageRowsClient({
  products,
  referenceDateIso,
}: {
  products: HomepageFeedItem[]
  referenceDateIso: string
}) {
  const sections = useMemo(
    () => buildTaxonomyProductSections(products, referenceDateIso),
    [products, referenceDateIso],
  )

  return <TaxonomyProductSections sections={sections} />
}
