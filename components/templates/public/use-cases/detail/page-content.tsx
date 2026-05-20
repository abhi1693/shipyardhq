import { notFound } from "next/navigation"
import Link from "next/link"
import { Suspense } from "react"

import { CategoryIcon } from "@/components/molecules/CategoryIcons"
import AffiliateLinkCard from "@/components/molecules/AffiliateLinkCard"
import {
  DirectoryHighlightsSidebar,
  DirectoryHighlightsSidebarSkeleton,
} from "@/components/templates/public/homepage/directory-highlights"
import {
  SponsoredProductsSection,
  SponsoredProductsSkeleton,
} from "@/components/templates/public/homepage/sponsored-products"
import {
  HERO_PRIMARY_BUTTON_CLASSES,
  HERO_SECONDARY_BUTTON_CLASSES,
} from "@/components/templates/public/categories/hero-button-classes"
import { StickyBanner } from "@/components/organisms/StickyBanner"
import PublicTwoColumnLayout from "@/components/layout/public/PublicTwoColumnLayout"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import {
  TrafficSidebarStats,
  TrafficSidebarStatsSkeleton,
} from "@/components/templates/public/common/TrafficSidebarStats"
import ProductFeedList from "@/components/organisms/feed/ProductFeedList"
import { getHomepageFeedViewAll } from "@/actions/public/homepage/feed"
import { DEFAULT_HOMEPAGE_FEED_VIEW } from "@/lib/homepage/feed-views"
import { pluralize } from "@/lib/pluralize"
import {
  BROWSE_PATH,
  HOME_PATH,
  MEMBER_PRODUCTS_PATH,
  USE_CASES_PATH,
  categoryPath,
  usecasePath,
} from "@/lib/routes"
import { buildProductListItem } from "@/lib/seo/product-list"
import { getUseCasePagePayload } from "@/lib/useCases/page-cache"
import { resolveSiteUrl } from "@/lib/siteConfig"

interface UseCasePageProps {
  params: Promise<{ slug: string }>
}

export async function UseCasePageContent({ params }: UseCasePageProps) {
  const { slug } = await params
  const data = await getUseCasePagePayload(slug)

  if (!data) notFound()

  const { useCase, categories, productCount } = data
  const homepageFeedItems = await getHomepageFeedViewAll({
    view: DEFAULT_HOMEPAGE_FEED_VIEW,
  })
  const referenceDateIso = new Date().toISOString()
  const categorySlugs = new Set(categories.map((c) => c.slug.toLowerCase()))
  const categoryNames = new Set(
    categories.map((c) => c.name?.toLowerCase()).filter(Boolean) as string[],
  )
  const useCaseFeedItems = homepageFeedItems.filter((item) => {
    const slugValue = item.categorySlug?.toLowerCase()
    const nameValue = item.category?.toLowerCase()
    if (slugValue && categorySlugs.has(slugValue)) return true
    if (nameValue && categoryNames.has(nameValue)) return true
    return false
  })

  const baseUrl = resolveSiteUrl()
  const path = usecasePath(useCase.slug)
  const pageUrl = `${baseUrl}${path}`
  const breadcrumbs = [
    { name: "Home", path: HOME_PATH },
    { name: "Use Cases", path: USE_CASES_PATH },
    { name: useCase.label, path },
  ]
  const description = `Explore ${productCount} ${pluralize(
    productCount,
    "product",
  )} built for ${useCase.label}.`
  const productList = useCaseFeedItems
    .slice(0, 20)
    .map((product, index) =>
      buildProductListItem({
        product,
        position: index + 1,
        siteUrl: baseUrl,
        categoryName: product.category,
      }),
    )
  const categoryMentions = categories.map((category) => ({
    "@type": "Thing",
    name: category.name,
    url: `${baseUrl}${categoryPath(category.slug)}`,
  }))
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${useCase.label} Use Case`,
    description,
    url: pageUrl,
    mainEntity: {
      "@type": "ItemList",
      name: `${useCase.label} Products`,
      itemListOrder: "https://schema.org/ItemListOrderDescending",
      itemListElement: productList,
    },
    about: {
      "@type": "Thing",
      name: useCase.label,
      url: pageUrl,
    },
    mentions: categoryMentions,
    isPartOf: {
      "@type": "WebSite",
      name: "ShipYardHQ",
      url: baseUrl,
    },
  }

  return (
    <main className="relative isolate bg-[#f5f7fb]">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CoreStructuredData
        scriptKeyPrefix={`use-case-${slug}`}
        webPage={{ path, name: `${useCase.label} Use Case` }}
        breadcrumbs={{ items: breadcrumbs }}
      />

      <PublicTwoColumnLayout
        className="pb-24 pt-12"
        mainClassName="gap-10"
        main={
          <>
            <section className="rounded-3xl border border-border/40 bg-white px-6 py-12 text-center shadow-[0_32px_96px_-60px_rgba(7,58,104,0.35)] sm:px-10">
              <div className="mx-auto flex max-w-2xl flex-col items-center gap-6">
                <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-border/40 bg-muted/40 text-[color:var(--brand-1)] shadow-[0_18px_42px_-28px_rgba(7,68,134,0.35)]">
                  <CategoryIcon
                    icon={categories[0]?.icon ?? "target"}
                    size={28}
                  />
                </span>
                <div className="space-y-4">
                  <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                    {useCase.label}
                  </h1>
                  <p className="text-base text-muted-foreground">
                    {description}
                  </p>
                </div>
                <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
                  <Link
                    href={`${BROWSE_PATH}?useCase=${useCase.slug}`}
                    className={`${HERO_PRIMARY_BUTTON_CLASSES} w-full justify-center sm:w-auto`}
                  >
                    Launch for this use case
                  </Link>
                  <Link
                    href={MEMBER_PRODUCTS_PATH}
                    className={`${HERO_SECONDARY_BUTTON_CLASSES} w-full justify-center sm:w-auto`}
                  >
                    Explore promotion tiers
                  </Link>
                </div>
              </div>
            </section>

            <StickyBanner className="mx-auto w-full rounded-2xl" />

            <section className="space-y-6" data-testid="use-case-feed-section">
              <ProductFeedList
                activeFilter={DEFAULT_HOMEPAGE_FEED_VIEW}
                items={useCaseFeedItems}
                referenceDateIso={referenceDateIso}
                showRemaining
              />
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
            <Suspense fallback={<DirectoryHighlightsSidebarSkeleton />}>
              <DirectoryHighlightsSidebar />
            </Suspense>
            <AffiliateLinkCard />
          </>
        }
      />
    </main>
  )
}
