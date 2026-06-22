import { notFound } from "next/navigation"
import { BadgeDollarSign } from "lucide-react"

import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { TaxonomyDetailPage } from "@/components/templates/public/common/TaxonomyDetailPage"
import { TaxonomyTrafficStatsSidebar } from "@/components/templates/public/common/TaxonomyTrafficStatsSidebar"
import { getTaxonomySponsorProducts } from "@/components/templates/public/common/taxonomy-sponsors"
import { TaxonomyProductGridFeed } from "@/components/templates/public/common/TaxonomyProductGridFeed"
import { resolveTaxonomyReferenceDateIso } from "@/components/templates/public/common/TaxonomyProductRows"
import {
  getPricingModelMeta,
  type PricingModelSlug,
} from "@/lib/pricing/models"
import { getPricingModelPagePayload } from "@/lib/pricing/page-cache"
import {
  BROWSE_PATH,
  HOME_PATH,
  MEMBER_PRODUCTS_ADD_PATH,
  PRICING_PATH,
  pricingModelPath,
} from "@/lib/routes"
import { buildProductListItem } from "@/lib/seo/product-list"
import { pluralize } from "@/lib/pluralize"

const DEFAULT_FILTERS = {
  sort: "new" as const,
  page: 1,
  verified: false,
}

export async function PricingModelPageContent({
  params,
}: {
  params: Promise<{ pricingModel: PricingModelSlug | string }>
}) {
  const { pricingModel } = await params
  const pricingModelMeta = getPricingModelMeta(pricingModel)
  if (!pricingModelMeta) return notFound()

  const [payload, taxonomySponsors] = await Promise.all([
    getPricingModelPagePayload(pricingModelMeta.slug, DEFAULT_FILTERS),
    getTaxonomySponsorProducts(),
  ])
  if (!payload) return notFound()

  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "https://shipyardhq.dev"
  ).replace(/\/$/, "")
  const pagePath = pricingModelPath(pricingModelMeta.slug)
  const resultCount = payload.total
  const referenceDateIso = resolveTaxonomyReferenceDateIso(payload.products)

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${pricingModelMeta.label} pricing products`,
    description: `Browse ${resultCount} ${pluralize(resultCount, "product")} with ${pricingModelMeta.label.toLowerCase()} pricing on Shipyard.`,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: payload.products.slice(0, 20).map((product, index) =>
      buildProductListItem({
        product,
        position: index + 1,
        siteUrl: baseUrl,
      }),
    ),
  }
  const pageTitle = `${pricingModelMeta.label} pricing products`

  return (
    <TaxonomyDetailPage
      title={pageTitle}
      description={pricingModelMeta.description}
      icon={
        <BadgeDollarSign className="h-10 w-10 text-[#c0ff00]" aria-hidden />
      }
      primaryCta={{
        href: MEMBER_PRODUCTS_ADD_PATH,
        label: "Launch with this pricing",
      }}
      secondaryCta={{
        href: PRICING_PATH,
        label: "Explore promotion tiers",
      }}
      tertiaryCta={{
        href: `${BROWSE_PATH}?pricingModel=${encodeURIComponent(pricingModelMeta.slug)}`,
        label: "Trending this week",
      }}
      stats={[
        { label: "Total Products", value: payload.total },
        {
          label: "Featured",
          value: payload.products.filter((product) => product.sponsored).length,
        },
      ]}
      feed={
        <TaxonomyProductGridFeed
          products={payload.products}
          hasMore={payload.hasMore}
          initialPage={2}
          referenceDateIso={referenceDateIso}
          searchParams={{
            pricingModel: pricingModelMeta.slug,
          }}
          emptyTitle={`No ${pricingModelMeta.label.toLowerCase()} launches yet`}
        />
      }
      feedTestId="pricing-model-feed-section"
      structuredData={
        <>
          <CoreStructuredData
            scriptKeyPrefix={`pricing-model-${pricingModelMeta.slug}`}
            webPage={{
              path: pagePath,
              name: pageTitle,
            }}
            breadcrumbs={{
              items: [
                { name: "Home", path: HOME_PATH },
                { name: "Pricing", path: PRICING_PATH },
                { name: pricingModelMeta.label, path: pagePath },
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
      sponsorProducts={taxonomySponsors}
      trafficStats={<TaxonomyTrafficStatsSidebar />}
    />
  )
}
