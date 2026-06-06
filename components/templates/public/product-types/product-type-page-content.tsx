import { notFound } from "next/navigation"
import { Boxes } from "lucide-react"

import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { TaxonomyDetailPage } from "@/components/templates/public/common/TaxonomyDetailPage"
import { getTaxonomySponsorProducts } from "@/components/templates/public/common/taxonomy-sponsors"
import { TaxonomyProductGridFeed } from "@/components/templates/public/common/TaxonomyProductGridFeed"
import {
  getProductTypeMeta,
  type ProductTypeSlug,
} from "@/lib/product-types/models"
import { getProductTypePagePayload } from "@/lib/product-types/page-cache"
import {
  BROWSE_PATH,
  HOME_PATH,
  MEMBER_PRODUCTS_ADD_PATH,
  PRICING_PATH,
  productTypePath,
} from "@/lib/routes"
import { buildProductListItem } from "@/lib/seo/product-list"
import { pluralize } from "@/lib/pluralize"

const DEFAULT_FILTERS = {
  sort: "new" as const,
  page: 1,
  verified: false,
}

export async function ProductTypePageContent({
  params,
}: {
  params: Promise<{ productType: ProductTypeSlug | string }>
}) {
  const { productType } = await params
  const productTypeMeta = getProductTypeMeta(productType)
  if (!productTypeMeta) return notFound()

  const [payload, taxonomySponsors] = await Promise.all([
    getProductTypePagePayload(productTypeMeta.slug, DEFAULT_FILTERS),
    getTaxonomySponsorProducts({ limit: 2 }),
  ])
  if (!payload) return notFound()

  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "https://shipyardhq.dev"
  ).replace(/\/$/, "")
  const pagePath = productTypePath(productTypeMeta.slug)
  const resultCount = payload.total
  const referenceDateIso = new Date().toISOString()

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${productTypeMeta.label} products`,
    description: `Browse ${resultCount} ${pluralize(resultCount, "product")} built as ${productTypeMeta.label.toLowerCase()} on Shipyard.`,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: payload.products.slice(0, 20).map((product, index) =>
      buildProductListItem({
        product,
        position: index + 1,
        siteUrl: baseUrl,
      }),
    ),
  }
  const pageTitle = `${productTypeMeta.label} products`
  const totalUpvotes = payload.products.reduce(
    (total, product) => total + (product.analytics?.upvotes ?? 0),
    0,
  )

  return (
    <TaxonomyDetailPage
      title={pageTitle}
      description={productTypeMeta.description}
      icon={<Boxes className="h-10 w-10 text-[#c0ff00]" aria-hidden />}
      primaryCta={{
        href: MEMBER_PRODUCTS_ADD_PATH,
        label: "Launch this product type",
      }}
      secondaryCta={{
        href: PRICING_PATH,
        label: "Explore promotion tiers",
      }}
      tertiaryCta={{
        href: `${BROWSE_PATH}?productType=${encodeURIComponent(productTypeMeta.slug)}`,
        label: "Trending this week",
      }}
      stats={[
        { label: "Total Products", value: payload.total },
        {
          label: "Featured",
          value: payload.products.filter((product) => product.sponsored).length,
        },
        { label: "Upvotes", value: totalUpvotes },
      ]}
      feed={
        <TaxonomyProductGridFeed
          products={payload.products}
          hasMore={payload.hasMore}
          initialPage={2}
          referenceDateIso={referenceDateIso}
          searchParams={{
            productType: productTypeMeta.slug,
          }}
          emptyTitle={`No ${productTypeMeta.label.toLowerCase()} launches yet`}
        />
      }
      feedTestId="product-type-feed-section"
      structuredData={
        <>
          <CoreStructuredData
            scriptKeyPrefix={`product-type-${productTypeMeta.slug}`}
            webPage={{
              path: pagePath,
              name: pageTitle,
            }}
            breadcrumbs={{
              items: [
                { name: "Home", path: HOME_PATH },
                { name: "Browse", path: BROWSE_PATH },
                { name: productTypeMeta.label, path: pagePath },
              ],
            }}
          />
          <script
            type="application/ld+json"
            suppressHydrationWarning
            dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
          />
        </>
      }
      sponsorProduct={taxonomySponsors[0] ?? null}
      secondarySponsor={taxonomySponsors[1] ?? null}
    />
  )
}
