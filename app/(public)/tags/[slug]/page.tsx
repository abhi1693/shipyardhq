import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { notFound } from "next/navigation"

import { formatTagLabel } from "@/app/(public)/tags/_utils"
import {
  getKeywordTagBySlug,
  getKeywordTagProducts,
} from "@/actions/public/tags/actions"
import {
  getHomepageFeedViewAll,
  type HomepageFeedItem,
} from "@/actions/public/homepage/feed"
import { StickyBanner } from "@/components/organisms/StickyBanner"
import PublicTwoColumnLayout from "@/components/layout/public/PublicTwoColumnLayout"
import ProductFeedList from "@/components/organisms/feed/ProductFeedList"
import {
  ProductUpdatesSection,
  ProductUpdatesSkeleton,
} from "@/components/templates/public/homepage/product-updates"
import {
  SponsoredProductsSection,
  SponsoredProductsSkeleton,
} from "@/components/templates/public/homepage/sponsored-products"
import {
  HERO_PRIMARY_BUTTON_CLASSES,
  HERO_SECONDARY_BUTTON_CLASSES,
} from "@/components/templates/public/categories/hero-button-classes"
import { MEMBER_PRODUCTS_PATH, PRICING_PATH } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { buildPageMetadata } from "@/lib/metadata"
import { getTagDetailPayload, getTagStaticParams } from "@/lib/tags/page-cache"
import { DEFAULT_HOMEPAGE_FEED_VIEW } from "@/lib/homepage/feed-views"
import { toProductCardItem } from "@/lib/products/card-item"
import type { ProductCardItem } from "@/components/molecules/ProductCard"

export const dynamic = "force-static"
export const revalidate = 300
export const generateStaticParams = getTagStaticParams

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const summary = await getKeywordTagBySlug(slug)
  if (!summary) return {}

  const label = formatTagLabel(summary.canonical || summary.keyword)
  return buildPageMetadata({
    title: `${label} Tag`,
    description: `Discover Shipyard products tagged with “${label}”. Browse the latest launches and tools connected to this keyword.`,
    section: "Tags",
  })
}

interface TagPageProps {
  params: Promise<{ slug: string }>
}

const FALLBACK_TAGLINE =
  "Discover launch-ready tools from indie makers worldwide."

function mapProductCardItemToFeedItem(
  product: ProductCardItem,
): HomepageFeedItem {
  const resolveCategoryName = () => {
    if (typeof product.categoryName !== "undefined") {
      return product.categoryName ?? null
    }
    return product.category?.name ?? null
  }

  const resolveCategorySlug = () => {
    if (typeof product.categorySlug !== "undefined") {
      return product.categorySlug ?? null
    }
    return product.category?.slug ?? null
  }

  const isSponsored =
    typeof product.isSponsored !== "undefined"
      ? product.isSponsored
      : Boolean(product.sponsored)

  const variant =
    typeof product.variant !== "undefined"
      ? product.variant
      : isSponsored
        ? "sponsored"
        : "default"

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    logo: product.logo,
    tagline: product.tagline || FALLBACK_TAGLINE,
    createdAt: product.createdAt ?? "",
    updatedAt: product.updatedAt ?? "",
    badges: product.badges ?? [],
    category: resolveCategoryName(),
    categorySlug: resolveCategorySlug(),
    scoreCount:
      typeof product.scoreCount === "number" ? product.scoreCount : undefined,
    updatesCount: product.updatesCount,
    isSponsored,
    isVoted: Boolean(product.isVoted),
    isVerified: Boolean(product.isVerified),
    variant,
    latestRevenueCents:
      typeof product.latestRevenueCents === "number"
        ? product.latestRevenueCents
        : null,
    revenueCurrencyCode: product.revenueCurrencyCode ?? null,
    shuffleRank: Math.random(),
  }
}

const MAX_TAG_PAGES = 50

export default async function TagDetailPage({ params }: TagPageProps) {
  const { slug } = await params

  const payload = await getTagDetailPayload(slug, 1)
  if (!payload) {
    notFound()
  }

  const { summary, products } = payload
  const tagLabel = formatTagLabel(summary.canonical || summary.keyword)
  const totalTaggedProducts = summary.productCount

  const collectedProducts = [...products.products]
  let hasMore = products.hasMore
  let page = 2

  while (hasMore && page <= MAX_TAG_PAGES) {
    const nextPage = await getKeywordTagProducts(summary.slug, page)
    if (!nextPage) {
      break
    }

    collectedProducts.push(...nextPage.products)

    const expectedTotal = nextPage.total ?? totalTaggedProducts
    hasMore = nextPage.hasMore && collectedProducts.length < expectedTotal
    page += 1
  }

  const tagProductItems = collectedProducts.map((product) =>
    toProductCardItem(product),
  )
  const tagProductIdSet = new Set(tagProductItems.map((item) => item.id))

  const homepageFeedItems = await getHomepageFeedViewAll({
    view: DEFAULT_HOMEPAGE_FEED_VIEW,
  })

  const filteredHomepageItems = homepageFeedItems.filter((item) => {
    if (item.isSponsored) {
      return true
    }
    return tagProductIdSet.has(item.id)
  })

  const seenIds = new Set(filteredHomepageItems.map((item) => item.id))

  const fallbackFeedItems = tagProductItems
    .filter((item) => !seenIds.has(item.id))
    .map((item) => mapProductCardItemToFeedItem(item))
    .sort((a, b) => {
      const aTime = new Date(a.createdAt ?? "").getTime()
      const bTime = new Date(b.createdAt ?? "").getTime()
      if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0
      if (Number.isNaN(aTime)) return 1
      if (Number.isNaN(bTime)) return -1
      return bTime - aTime
    })

  const combinedFeedItems: HomepageFeedItem[] = []
  const combinedSeen = new Set<string>()

  for (const item of filteredHomepageItems) {
    if (combinedSeen.has(item.id)) continue
    combinedSeen.add(item.id)
    combinedFeedItems.push(item)
  }

  for (const item of fallbackFeedItems) {
    if (combinedSeen.has(item.id)) continue
    combinedSeen.add(item.id)
    combinedFeedItems.push(item)
  }

  const taggedCount = tagProductIdSet.size

  return (
    <main className="relative isolate bg-[#f5f7fb]">
      <PublicTwoColumnLayout
        className="pb-24 pt-12"
        mainClassName="gap-10"
        sidebarClassName="lg:sticky lg:top-24"
        main={
          <>
            <section className="rounded-3xl border border-border/40 bg-white px-6 py-12 text-center shadow-[0_32px_96px_-60px_rgba(7,58,104,0.35)] sm:px-10">
              <div className="mx-auto flex max-w-2xl flex-col items-center gap-6">
                <div className="space-y-4">
                  <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                    {tagLabel}
                  </h1>
                  <p className="text-base text-muted-foreground">
                    Explore launches using the “{tagLabel}” keyword.
                  </p>
                </div>
                <p className="text-sm font-medium text-muted-foreground/80">
                  {new Intl.NumberFormat().format(totalTaggedProducts)}{" "}
                  {totalTaggedProducts === 1 ? "product" : "products"} currently
                  include this tag.
                </p>
                <div className="flex w-full flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
                  <Link
                    href={MEMBER_PRODUCTS_PATH}
                    className={cn(
                      HERO_PRIMARY_BUTTON_CLASSES,
                      "w-full justify-center sm:w-auto",
                    )}
                  >
                    Launch with this keyword
                  </Link>
                  <Link
                    href={PRICING_PATH}
                    className={cn(
                      HERO_SECONDARY_BUTTON_CLASSES,
                      "w-full justify-center sm:w-auto",
                    )}
                  >
                    Explore promotion tiers
                  </Link>
                </div>
              </div>
            </section>

            <StickyBanner className="mx-auto w-full rounded-2xl" />

            <section className="space-y-6" data-testid="tag-feed-section">
              <h2 className="sr-only">Tag feed</h2>
              {combinedFeedItems.length > 0 ? (
                <ProductFeedList
                  activeFilter={DEFAULT_HOMEPAGE_FEED_VIEW}
                  items={combinedFeedItems}
                  showRemaining
                />
              ) : (
                <div className="rounded-3xl border border-dashed border-border/40 bg-white/70 px-6 py-12 text-center text-sm font-medium text-muted-foreground">
                  No launches use this keyword yet. Check back soon.
                </div>
              )}
              {taggedCount > 0 ? (
                <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
                  Showing {new Intl.NumberFormat().format(taggedCount)} tagged
                  product{taggedCount === 1 ? "" : "s"}
                </p>
              ) : null}
            </section>
          </>
        }
        sidebar={
          <>
            <Suspense fallback={<SponsoredProductsSkeleton />}>
              <SponsoredProductsSection />
            </Suspense>
            <Suspense fallback={<ProductUpdatesSkeleton />}>
              <ProductUpdatesSection />
            </Suspense>
          </>
        }
      />
    </main>
  )
}
