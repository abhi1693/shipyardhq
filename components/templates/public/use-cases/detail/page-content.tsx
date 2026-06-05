import { notFound } from "next/navigation"

import { CategoryIcon } from "@/components/molecules/CategoryIcons"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import {
  TaxonomyDetailPage,
  type TaxonomySponsorProduct,
} from "@/components/templates/public/common/TaxonomyDetailPage"
import { TaxonomyHomepageRowsClient } from "@/components/templates/public/common/TaxonomyProductRows"
import {
  getHomepageFeedViewAll,
  type HomepageFeedItem,
} from "@/actions/public/homepage/feed"
import { DEFAULT_HOMEPAGE_FEED_VIEW } from "@/lib/homepage/feed-views"
import { pluralize } from "@/lib/pluralize"
import {
  BROWSE_PATH,
  HOME_PATH,
  MEMBER_PRODUCTS_ADD_PATH,
  PRICING_PATH,
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

function toSponsorProduct(
  item: HomepageFeedItem | null | undefined,
): TaxonomySponsorProduct | null {
  if (!item) return null

  return {
    slug: item.slug,
    name: item.name,
    tagline: item.tagline,
  }
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
  const firstOrganicItem =
    useCaseFeedItems.find((item) => !item.isSponsored) ?? useCaseFeedItems[0]
  const secondOrganicItem =
    useCaseFeedItems.find(
      (item) => !item.isSponsored && item.id !== firstOrganicItem?.id,
    ) ?? useCaseFeedItems.find((item) => item.id !== firstOrganicItem?.id)

  return (
    <TaxonomyDetailPage
      title={useCase.label}
      description={description}
      icon={
        <CategoryIcon
          icon={categories[0]?.icon ?? "target"}
          size={40}
          className="text-[#c0ff00]"
        />
      }
      primaryCta={{
        href: MEMBER_PRODUCTS_ADD_PATH,
        label: "Launch for this use case",
      }}
      secondaryCta={{
        href: PRICING_PATH,
        label: "Explore promotion tiers",
      }}
      tertiaryCta={{
        href: `${BROWSE_PATH}?useCase=${encodeURIComponent(useCase.slug)}`,
        label: "Trending this week",
      }}
      stats={[
        { label: "Total Products", value: productCount },
        { label: "Categories", value: categories.length },
        { label: "Launches", value: useCaseFeedItems.length },
      ]}
      feed={
        <TaxonomyHomepageRowsClient
          products={useCaseFeedItems}
          referenceDateIso={referenceDateIso}
        />
      }
      feedTestId="use-case-feed-section"
      structuredData={
        <>
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
        </>
      }
      sponsorProduct={toSponsorProduct(firstOrganicItem)}
      secondarySponsor={toSponsorProduct(secondOrganicItem)}
    />
  )
}
