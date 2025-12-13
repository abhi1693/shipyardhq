import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import Link from "next/link"

import prisma from "@/lib/prisma"
import {
  getProductInterestSignalsMap,
  getTrendingCategoryProductIds,
} from "@/lib/server/analytics/productInterest"
import {
  mapProductCardRecordToBase,
  productCardSelect,
  type ProductCardRecord,
} from "@/lib/products/selects"
import { toProductCardItem } from "@/lib/products/card-item"
import ProductGrid from "@/components/molecules/ProductGrid"
import { buildPageMetadata } from "@/lib/metadata"
import {
  CATEGORIES_PATH,
  HOME_PATH,
  categoryPath,
  productPath,
} from "@/lib/routes"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import PublicTwoColumnLayout from "@/components/layout/public/PublicTwoColumnLayout"
import { StickyBanner } from "@/components/organisms/StickyBanner"
import {
  TrafficSidebarStats,
  TrafficSidebarStatsSkeleton,
} from "@/components/templates/public/common/TrafficSidebarStats"
import {
  SponsoredProductsSection,
  SponsoredProductsSkeleton,
} from "@/components/templates/public/homepage/sponsored-products"
import { cn } from "@/lib/utils"
import { pluralize } from "@/lib/pluralize"

interface CategoryTrendsPageProps {
  params: Promise<{ slug: string }>
}

export const dynamic = "force-dynamic"

export async function generateMetadata(
  props: CategoryTrendsPageProps,
): Promise<Metadata> {
  const { slug } = await props.params
  const category = await prisma.category.findUnique({
    where: { slug },
    select: { name: true, description: true, slug: true },
  })

  if (!category) return {}

  const canonical = `/trends/categories/${category.slug}`
  const title = `Trending tools in ${category.name}`
  return buildPageMetadata({
    title,
    section: "Trends",
    description:
      category.description ??
      `Most clicked tools in ${category.name} this week.`,
    canonical,
  })
}

export default async function TrendingToolsInCategoryPage({
  params,
}: CategoryTrendsPageProps) {
  const { slug } = await params
  const category = await prisma.category.findUnique({
    where: { slug },
    select: { id: true, name: true, description: true, slug: true },
  })

  if (!category) notFound()

  const ids = await getTrendingCategoryProductIds({
    categorySlug: category.slug,
    days: 7,
    limit: 60,
  })

  const path = `/trends/categories/${category.slug}`
  const breadcrumbs = [
    { name: "Home", path: HOME_PATH },
    { name: "Categories", path: CATEGORIES_PATH },
    { name: category.name, path: categoryPath(category.slug) },
    { name: "Trending", path },
  ]

  if (!ids.length) {
    return (
      <main className="relative isolate bg-[#f5f7fb]">
        <CoreStructuredData
          scriptKeyPrefix={`trends-category-${category.slug}`}
          webPage={{ path, name: `Trending tools in ${category.name}` }}
          breadcrumbs={{ items: breadcrumbs }}
        />
        <PublicTwoColumnLayout
          className="pb-24 pt-12"
          mainClassName="gap-10"
          main={
            <>
              <section className="rounded-3xl border border-border/40 bg-white px-6 py-10 shadow-[0_32px_96px_-60px_rgba(7,58,104,0.35)] sm:px-10">
                <div className="space-y-4">
                  <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                    Trending tools in {category.name}
                  </h1>
                  <p className="max-w-2xl text-base text-muted-foreground">
                    No data yet — check back soon.
                  </p>
                  <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:gap-4">
                    <Link
                      href={categoryPath(category.slug)}
                      className={cn(
                        "inline-flex w-full justify-center rounded-full bg-[color:var(--brand-1)] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_42px_-28px_rgba(7,68,134,0.35)] transition hover:bg-[color:var(--brand-1)]/90 sm:w-auto",
                      )}
                    >
                      View category
                    </Link>
                    <Link
                      href={`/browse?category=${encodeURIComponent(category.slug)}`}
                      className={cn(
                        "inline-flex w-full justify-center rounded-full border border-border/60 bg-white px-6 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:border-border hover:bg-muted/60 sm:w-auto",
                      )}
                    >
                      Browse category
                    </Link>
                  </div>
                </div>
              </section>
              <StickyBanner className="mx-auto w-full rounded-2xl" />
            </>
          }
          sidebar={
            <>
              <Suspense fallback={<TrafficSidebarStatsSkeleton />}>
                <TrafficSidebarStats />
              </Suspense>
              <Suspense fallback={<SponsoredProductsSkeleton />}>
                <SponsoredProductsSection />
              </Suspense>
            </>
          }
        />
      </main>
    )
  }

  const records = (await prisma.product.findMany({
    where: {
      id: { in: ids },
      status: "published",
      category: { is: { slug: category.slug } },
    },
    select: productCardSelect,
  })) as unknown as ProductCardRecord[]

  if (!records.length) notFound()

  const recordMap = new Map<string, ProductCardRecord>(
    records.map((record) => [record.id, record]),
  )
  const ordered = ids
    .map((id) => recordMap.get(id))
    .filter((record): record is ProductCardRecord => Boolean(record))

  const interestMap = await getProductInterestSignalsMap({
    products: ordered.map((record) => ({ id: record.id, slug: record.slug })),
  })

  const now = new Date()
  const items = ordered.map((record) =>
    toProductCardItem({
      ...mapProductCardRecordToBase(record, now),
      interest: interestMap.get(record.id) ?? null,
    }),
  )

  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "https://shipyardhq.dev"
  ).replace(/\/$/, "")
  const toAbsoluteUrl = (value?: string | null) => {
    if (!value) return undefined
    const trimmed = value.trim()
    if (!trimmed) return undefined
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    if (trimmed.startsWith("/")) return `${baseUrl}${trimmed}`
    return `${baseUrl}/${trimmed}`
  }

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Trending tools in ${category.name}`,
    description: `Browse ${items.length} trending ${pluralize(items.length, "tool")} in ${category.name}.`,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: ordered.slice(0, 20).map((product, index) => {
      const url = `${baseUrl}${productPath(product.slug)}`
      return {
        "@type": "ListItem",
        position: index + 1,
        url,
        item: {
          "@type": "Product",
          name: product.name,
          description: product.tagline ?? undefined,
          image: toAbsoluteUrl(product.logo),
          url,
          category: category.name,
        },
      }
    }),
  }

  return (
    <main className="relative isolate bg-[#f5f7fb]">
      <CoreStructuredData
        scriptKeyPrefix={`trends-category-${category.slug}`}
        webPage={{ path, name: `Trending tools in ${category.name}` }}
        breadcrumbs={{ items: breadcrumbs }}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />
      <PublicTwoColumnLayout
        className="pb-24 pt-12"
        mainClassName="gap-10"
        main={
          <>
            <section className="rounded-3xl border border-border/40 bg-white px-6 py-10 shadow-[0_32px_96px_-60px_rgba(7,58,104,0.35)] sm:px-10">
              <div className="space-y-4">
                <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                  Trending tools in {category.name}
                </h1>
                {category.description ? (
                  <p className="max-w-3xl text-base text-muted-foreground">
                    {category.description}
                  </p>
                ) : (
                  <p className="max-w-2xl text-base text-muted-foreground">
                    Most clicked in the last 7 days.
                  </p>
                )}
                <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:gap-4">
                  <Link
                    href={categoryPath(category.slug)}
                    className={cn(
                      "inline-flex w-full justify-center rounded-full bg-[color:var(--brand-1)] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_42px_-28px_rgba(7,68,134,0.35)] transition hover:bg-[color:var(--brand-1)]/90 sm:w-auto",
                    )}
                  >
                    View category
                  </Link>
                  <Link
                    href={`/browse?category=${encodeURIComponent(category.slug)}`}
                    className={cn(
                      "inline-flex w-full justify-center rounded-full border border-border/60 bg-white px-6 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:border-border hover:bg-muted/60 sm:w-auto",
                    )}
                  >
                    Browse category
                  </Link>
                </div>
              </div>
            </section>

            <StickyBanner className="mx-auto w-full rounded-2xl" />

            <section className="space-y-6">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Most clicked this week
              </h2>
              <ProductGrid items={items} className="space-y-5" />
            </section>
          </>
        }
        sidebar={
          <>
            <Suspense fallback={<TrafficSidebarStatsSkeleton />}>
              <TrafficSidebarStats />
            </Suspense>
            <Suspense fallback={<SponsoredProductsSkeleton />}>
              <SponsoredProductsSection />
            </Suspense>
          </>
        }
      />
    </main>
  )
}
