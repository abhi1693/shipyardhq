import { notFound } from "next/navigation"

import { CategoryIcon } from "@/components/molecules/CategoryIcons"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { TaxonomyDetailPage } from "@/components/templates/public/common/TaxonomyDetailPage"
import { getTaxonomySponsorProducts } from "@/components/templates/public/common/taxonomy-sponsors"
import {
  buildTaxonomyProductSections,
  mapProductCardBaseToTaxonomyFeedItem,
  resolveTaxonomyReferenceDateIso,
  TaxonomyProductSections,
} from "@/components/templates/public/common/TaxonomyProductRows"
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
import { BRAND_NAME } from "@/lib/brand"
import { getUseCasePagePayload } from "@/lib/useCases/page-cache"
import { resolveSiteUrl } from "@/lib/siteConfig"
import { getPublicUseCaseProductsPage } from "@/actions/public/use-cases/actions"
import { mapProductCardRecordToBase } from "@/lib/products/selects"
import { getPriorityPlacementPlanIds } from "@/lib/products/priority-plans"

const USE_CASE_DETAIL_INITIAL_PAGE_SIZE = 6

interface UseCasePageProps {
  params: Promise<{ slug: string }>
}

export async function UseCasePageContent({ params }: UseCasePageProps) {
  const { slug } = await params
  const [data, taxonomySponsors, productsPage, priorityPlanIds] =
    await Promise.all([
      getUseCasePagePayload(slug),
      getTaxonomySponsorProducts(),
      getPublicUseCaseProductsPage({
        slug,
        pageSize: USE_CASE_DETAIL_INITIAL_PAGE_SIZE,
      }),
      getPriorityPlacementPlanIds(),
    ])

  if (!data) notFound()

  const { useCase, categories, productCount } = data
  const referenceDateIso = resolveTaxonomyReferenceDateIso(
    productsPage.products,
  )
  const referenceDate = referenceDateIso ? new Date(referenceDateIso) : null
  const placementNow = new Date(productsPage.generatedAt)
  const useCaseFeedItems = productsPage.products.map((product) =>
    mapProductCardBaseToTaxonomyFeedItem(
      mapProductCardRecordToBase(
        product,
        referenceDate ?? product.updatedAt ?? product.createdAt,
        {
          priorityPlanIds,
          placementNow,
        },
      ),
    ),
  )

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
  const productList = useCaseFeedItems.slice(0, 20).map((product, index) =>
    buildProductListItem({
      product,
      position: index + 1,
      siteUrl: baseUrl,
      categoryName: product.category,
    }),
  )
  const feedSections = referenceDateIso
    ? buildTaxonomyProductSections(useCaseFeedItems, referenceDateIso)
    : []
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
      name: BRAND_NAME,
      url: baseUrl,
    },
  }

  return (
    <TaxonomyDetailPage
      carbonPathname={path}
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
      feed={<TaxonomyProductSections sections={feedSections} />}
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
      sponsorProducts={taxonomySponsors}
    />
  )
}
