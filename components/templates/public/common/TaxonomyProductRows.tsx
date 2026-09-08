import { Fragment, type ReactNode } from "react"
import { CarbonFeedAd } from "@/components/molecules/CarbonFeedAd"
import { feedAdIndex } from "@/lib/ads/feed"
import Link from "next/link"
import { ArrowUp, ImageIcon, Sparkles, TrendingUp } from "lucide-react"
import { format, isSameDay, startOfWeek, subDays } from "date-fns"

import type { HomepageFeedItem } from "@/actions/public/homepage/feed"
import { ProductLogoImage } from "@/components/atoms/product-logo-image"
import { ProductCategoryPills } from "@/components/molecules/ProductCategoryPills"
import type { ProductCardBase } from "@/components/molecules/ProductCard"
import { productCardPath } from "@/lib/routes"
import { toProductCardItem } from "@/lib/products/card-item"

export type TaxonomyProductSection = {
  key: string
  title: string
  dateLabel: string
  products: HomepageFeedItem[]
}

type TaxonomyReferenceDateItem = {
  publishedAt?: string | Date | null
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
}

function coerceValidDate(value?: string | Date | null): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function resolveTaxonomyReferenceDateIso(
  items: TaxonomyReferenceDateItem[],
): string | null {
  for (const item of items) {
    const date =
      coerceValidDate(item.publishedAt) ??
      coerceValidDate(item.createdAt) ??
      coerceValidDate(item.updatedAt)
    if (date) return date.toISOString()
  }

  return null
}

function productDate(product: HomepageFeedItem) {
  const raw = product.publishedAt ?? product.createdAt
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? new Date(0) : date
}

export function mapProductCardBaseToTaxonomyFeedItem(
  product: ProductCardBase,
): HomepageFeedItem {
  const item = toProductCardItem(product)
  const categoryName =
    typeof item.categoryName !== "undefined"
      ? (item.categoryName ?? null)
      : (item.category?.name ?? null)
  const categorySlug =
    typeof item.categorySlug !== "undefined"
      ? (item.categorySlug ?? null)
      : (item.category?.slug ?? null)
  const isSponsored = Boolean(item.sponsored ?? item.isSponsored)

  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    logo: item.logo,
    tagline:
      item.tagline ||
      "Discover launch-ready tools from indie makers worldwide.",
    createdAt: item.createdAt ?? "",
    updatedAt: item.updatedAt ?? "",
    badges: item.badges ?? [],
    category: categoryName,
    categorySlug,
    categories: item.categories ?? [],
    upvoteCount: item.analytics?.upvotes ?? 0,
    scoreCount: item.scoreCount,
    updatesCount: item.updatesCount,
    isSponsored,
    isVoted: Boolean(item.isVoted),
    isVerified: Boolean(item.isVerified),
    variant: item.variant ?? (isSponsored ? "sponsored" : "default"),
    interest: item.interest ?? null,
    shuffleRank: 0,
  }
}

export function buildTaxonomyProductSections(
  products: HomepageFeedItem[],
  referenceDateIso: string,
): TaxonomyProductSection[] {
  const referenceDate = new Date(referenceDateIso)
  if (Number.isNaN(referenceDate.getTime())) return []

  const previousDate = subDays(referenceDate, 1)
  const weekStart = startOfWeek(referenceDate)

  const sections = new Map<string, TaxonomyProductSection>()

  for (const product of products) {
    const date = productDate(product)
    let key = "earlier"
    let title = "Recent launches"

    if (isSameDay(date, referenceDate)) {
      key = "latest"
      title = "Latest launches"
    } else if (isSameDay(date, previousDate)) {
      key = "previous"
      title = "Previous launches"
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

  return ["latest", "previous", "week", "earlier"]
    .map((key) => sections.get(key))
    .filter((section): section is TaxonomyProductSection => Boolean(section))
}

function ProductLogo({ product }: { product: HomepageFeedItem }) {
  if (!product.logo) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#eff4ff] text-[#43474c]">
        <ImageIcon className="h-6 w-6" aria-hidden />
      </div>
    )
  }

  return (
    <ProductLogoImage
      src={product.logo}
      name={product.name}
      fill
      sizes="56px"
      className="object-cover"
    />
  )
}

export function TaxonomyProductRow({ product }: { product: HomepageFeedItem }) {
  const href = productCardPath(product.slug, { sponsored: product.isSponsored })
  const redirectsToWebsite = product.isSponsored
  const momentum = product.scoreCount
    ? Math.max(1, Math.round(product.scoreCount / 10))
    : null

  return (
    <article className="group flex items-center gap-4 rounded-lg border border-[#e2e8f0] bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
      <Link
        href={href}
        prefetch={redirectsToWebsite ? false : undefined}
        target={redirectsToWebsite ? "_blank" : undefined}
        rel={redirectsToWebsite ? "noopener noreferrer sponsored" : undefined}
        className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#eff4ff]"
      >
        <ProductLogo product={product} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={href}
          prefetch={redirectsToWebsite ? false : undefined}
          target={redirectsToWebsite ? "_blank" : undefined}
          rel={redirectsToWebsite ? "noopener noreferrer sponsored" : undefined}
          className="block truncate text-lg font-semibold text-black transition group-hover:text-[#0051d5]"
        >
          {product.name}
        </Link>
        <p className="line-clamp-1 text-sm text-[#43474c]">{product.tagline}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <ProductCategoryPills
            categories={product.categories}
            emptyLabel="Product"
            className="gap-1.5"
            pillClassName="rounded border-0 bg-[#f8fafc] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#43474c]"
            linkClassName="hover:bg-[#0051d5]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0051d5] focus-visible:ring-offset-2"
          />
          {product.isSponsored || product.badges.length > 0 ? (
            <span className="inline-flex items-center gap-1 rounded bg-[#ffedd5] px-2 py-1 text-[11px] font-semibold text-[#9a3412]">
              <Sparkles className="h-3 w-3" aria-hidden />
              New launch
            </span>
          ) : momentum ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#166534]">
              <TrendingUp className="h-3 w-3" aria-hidden />+{momentum}%
              momentum
            </span>
          ) : null}
        </div>
      </div>
      <Link
        href={href}
        prefetch={redirectsToWebsite ? false : undefined}
        target={redirectsToWebsite ? "_blank" : undefined}
        rel={redirectsToWebsite ? "noopener noreferrer sponsored" : undefined}
        className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-[#eff6ff] text-[#0051d5] transition hover:bg-[#0051d5] hover:text-white active:scale-95"
        aria-label={`View ${product.name}`}
      >
        <ArrowUp className="h-5 w-5" aria-hidden />
      </Link>
    </article>
  )
}

export function TaxonomyProductSections({
  sections,
  renderAfterSponsoredProduct,
}: {
  sections: TaxonomyProductSection[]
  renderAfterSponsoredProduct?: (context: {
    product: HomepageFeedItem
    section: TaxonomyProductSection
  }) => ReactNode
}) {
  return (
    <div className="space-y-12">
      {sections.map((section, sectionIndex) => {
        const adIndex = feedAdIndex(section.products, {
          before: sections
            .slice(0, sectionIndex)
            .flatMap((entry) => entry.products),
          after: sections
            .slice(sectionIndex + 1)
            .flatMap((entry) => entry.products),
        })
        const lastSponsoredIndex = section.products.reduce(
          (lastIndex, current, currentIndex) =>
            current.isSponsored ? currentIndex : lastIndex,
          -1,
        )
        const adBoundaryIndex = lastSponsoredIndex >= 0 ? lastSponsoredIndex : 0

        return (
          <section
            key={section.key}
            className="space-y-3"
            data-product-feed-section={section.key}
          >
            <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-4">
              <h2 className="text-2xl font-semibold tracking-tight text-black">
                {section.title}
              </h2>
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#43474c]">
                {section.dateLabel}
              </span>
            </div>
            <div className="space-y-3">
              {section.products.flatMap((product, index) => [
                <Fragment key={product.id}>
                  <TaxonomyProductRow product={product} />
                  {index === adBoundaryIndex
                    ? renderAfterSponsoredProduct?.({
                        product,
                        section,
                      })
                    : null}
                </Fragment>,
                index === adIndex ? (
                  <CarbonFeedAd
                    key={`ad-${section.key}`}
                    section={`taxonomy-${section.key}`}
                  />
                ) : null,
              ])}
            </div>
          </section>
        )
      })}
    </div>
  )
}
