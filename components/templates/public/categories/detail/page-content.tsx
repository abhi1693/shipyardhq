import { Suspense } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"

import { CategoryIcon } from "@/components/molecules/CategoryIcons"
import { MEMBER_PRODUCTS_PATH, PRICING_PATH } from "@/lib/routes"
import { StickyBanner } from "@/components/organisms/StickyBanner"
import PublicTwoColumnLayout from "@/components/layout/public/PublicTwoColumnLayout"
import { cn } from "@/lib/utils"
import {
  SponsoredProductsSection,
  SponsoredProductsSkeleton,
} from "@/components/templates/public/homepage/sponsored-products"
import {
  ProductUpdatesSection,
  ProductUpdatesSkeleton,
} from "@/components/templates/public/homepage/product-updates"
import { getCategoryDetailPayload } from "@/lib/categories/page-cache"
import { getHomepageFeedViewAll } from "@/actions/public/homepage/feed"
import { DEFAULT_HOMEPAGE_FEED_VIEW } from "@/lib/homepage/feed-views"
import ProductFeedList from "@/components/organisms/feed/ProductFeedList"
import {
  HERO_PRIMARY_BUTTON_CLASSES,
  HERO_SECONDARY_BUTTON_CLASSES,
} from "@/components/templates/public/categories/hero-button-classes"

interface CategoryPageProps {
  params: Promise<{ slug: string }>
}

export async function CategoryDetailPageContent({ params }: CategoryPageProps) {
  const { slug } = await params
  const data = await getCategoryDetailPayload(slug)

  if (!data) {
    notFound()
  }

  const { category } = data

  const homepageFeedItems = await getHomepageFeedViewAll({
    view: DEFAULT_HOMEPAGE_FEED_VIEW,
  })

  const categorySlug = category.slug?.toLowerCase()
  const categoryName = category.name?.toLowerCase()
  const categoryFeedItems = homepageFeedItems.filter((item) => {
    if (item.isSponsored) return true
    const itemSlug = item.categorySlug?.toLowerCase()
    if (itemSlug && categorySlug && itemSlug === categorySlug) {
      return true
    }
    const itemCategory = item.category?.toLowerCase()
    return Boolean(
      itemCategory && categoryName && itemCategory === categoryName,
    )
  })

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
                <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-border/40 bg-muted/40 text-[color:var(--brand-1)] shadow-[0_18px_42px_-28px_rgba(7,68,134,0.35)]">
                  <CategoryIcon icon={category.icon} size={28} />
                </span>
                <div className="space-y-4">
                  <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                    {category.name}
                  </h1>
                  {category.description ? (
                    <p className="text-base text-muted-foreground">
                      {category.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
                  <Link
                    href={MEMBER_PRODUCTS_PATH}
                    className={cn(
                      HERO_PRIMARY_BUTTON_CLASSES,
                      "w-full justify-center sm:w-auto",
                    )}
                  >
                    Launch in this category
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

            <section className="space-y-6" data-testid="category-feed-section">
              <ProductFeedList
                activeFilter={DEFAULT_HOMEPAGE_FEED_VIEW}
                items={categoryFeedItems}
                showRemaining
              />
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
