import { notFound } from "next/navigation"
import { Globe2 } from "lucide-react"

import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { TaxonomyDetailPage } from "@/components/templates/public/common/TaxonomyDetailPage"
import { TaxonomyTrafficStatsSidebar } from "@/components/templates/public/common/TaxonomyTrafficStatsSidebar"
import { getTaxonomySponsorProducts } from "@/components/templates/public/common/taxonomy-sponsors"
import { TaxonomyProductGridFeed } from "@/components/templates/public/common/TaxonomyProductGridFeed"
import { resolveTaxonomyReferenceDateIso } from "@/components/templates/public/common/TaxonomyProductRows"
import { getPlatformMeta } from "@/lib/platforms/config"
import { getPlatformPagePayload } from "@/lib/platforms/page-cache"
import { PSEO_PRODUCT_SLICE_PAGE_SIZE } from "@/lib/pseo/product-slices"
import {
  BROWSE_PATH,
  HOME_PATH,
  MEMBER_PRODUCTS_ADD_PATH,
  PRICING_PATH,
  platformPath,
} from "@/lib/routes"
import { buildProductListItem } from "@/lib/seo/product-list"
import { pluralize } from "@/lib/pluralize"

const DEFAULT_FILTERS = {
  sort: "new" as const,
  page: 1,
  verified: false,
}

export async function PlatformPageContent({
  params,
}: {
  params: Promise<{ platform: string }>
}) {
  const { platform } = await params
  const platformMeta = getPlatformMeta(platform)
  if (!platformMeta) return notFound()

  const [payload, taxonomySponsors] = await Promise.all([
    getPlatformPagePayload(platformMeta.slug, DEFAULT_FILTERS),
    getTaxonomySponsorProducts(),
  ])
  if (!payload) return notFound()

  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "https://shipyardhq.dev"
  ).replace(/\/$/, "")
  const pagePath = platformPath(platformMeta.slug)
  const resultCount = payload.total
  const referenceDateIso = resolveTaxonomyReferenceDateIso(payload.products)

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${platformMeta.label} products`,
    description: `Browse ${resultCount} ${pluralize(resultCount, "product")} built for ${platformMeta.label}.`,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: payload.products.slice(0, 20).map((product, index) =>
      buildProductListItem({
        product,
        position: index + 1,
        siteUrl: baseUrl,
      }),
    ),
  }
  const pageTitle = `${platformMeta.label} products`

  return (
    <TaxonomyDetailPage
      title={pageTitle}
      description={platformMeta.description}
      icon={<Globe2 className="h-10 w-10 text-[#c0ff00]" aria-hidden />}
      primaryCta={{
        href: MEMBER_PRODUCTS_ADD_PATH,
        label: "Launch on this platform",
      }}
      secondaryCta={{
        href: PRICING_PATH,
        label: "Explore promotion tiers",
      }}
      tertiaryCta={{
        href: `${BROWSE_PATH}?platform=${encodeURIComponent(platformMeta.slug)}`,
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
          pageSize={PSEO_PRODUCT_SLICE_PAGE_SIZE}
          referenceDateIso={referenceDateIso}
          searchParams={{
            platform: platformMeta.slug,
          }}
          emptyTitle={`No ${platformMeta.label} launches yet`}
        />
      }
      feedTestId="platform-feed-section"
      structuredData={
        <>
          <CoreStructuredData
            scriptKeyPrefix={`platform-${platformMeta.slug}`}
            webPage={{ path: pagePath, name: pageTitle }}
            breadcrumbs={{
              items: [
                { name: "Home", path: HOME_PATH },
                { name: platformMeta.label, path: pagePath },
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
