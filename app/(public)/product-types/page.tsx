import type { ReactNode } from "react"
import {
  Braces,
  Boxes,
  Code2,
  GalleryHorizontalEnd,
  Globe2,
  Monitor,
  Smartphone,
} from "lucide-react"

import {
  TaxonomyIndexPage,
  type TaxonomyIndexItem,
} from "@/components/templates/public/common/TaxonomyIndexPage"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import {
  getProductTypeMeta,
  PRODUCT_TYPE_SLUGS,
  type ProductTypeSlug,
} from "@/lib/product-types/models"
import { getProductTypePagePayload } from "@/lib/product-types/page-cache"
import { HOME_PATH, PRODUCT_TYPES_PATH, productTypePath } from "@/lib/routes"
import { buildPageMetadata } from "@/lib/metadata"
import { BRAND_NAME } from "@/lib/brand"

const PAGE_TITLE = "Product Types"

export const metadata = buildPageMetadata({
  title: PAGE_TITLE,
  description: `Browse ${BRAND_NAME} launches by product type, including SaaS, APIs, mobile apps, desktop apps, browser extensions, and open-source tools.`,
  canonical: PRODUCT_TYPES_PATH,
})

const productTypeIcons: Record<ProductTypeSlug, ReactNode> = {
  saas: <Globe2 className="h-5 w-5" aria-hidden />,
  "browser-extension": <GalleryHorizontalEnd className="h-5 w-5" aria-hidden />,
  "mobile-app": <Smartphone className="h-5 w-5" aria-hidden />,
  "desktop-app": <Monitor className="h-5 w-5" aria-hidden />,
  api: <Braces className="h-5 w-5" aria-hidden />,
  "open-source": <Code2 className="h-5 w-5" aria-hidden />,
  other: <Boxes className="h-5 w-5" aria-hidden />,
}

export default async function ProductTypesPage() {
  const productTypeItems = await Promise.all(
    PRODUCT_TYPE_SLUGS.map(async (slug, index) => {
      const meta = getProductTypeMeta(slug)
      const payload = await getProductTypePagePayload(slug, {
        sort: "new",
        page: 1,
        verified: false,
      })

      if (!meta) {
        throw new Error(`Missing product type metadata for ${slug}`)
      }

      return {
        key: meta.slug,
        title: meta.label,
        description: meta.description,
        href: productTypePath(meta.slug),
        count: payload?.total ?? 0,
        icon: productTypeIcons[slug],
        momentum: 4.4 + (index % 4) * 1.5,
        tone: index % 3 === 0 ? "blue" : index % 3 === 1 ? "green" : "orange",
      } satisfies TaxonomyIndexItem
    }),
  )

  const items: TaxonomyIndexItem[] = productTypeItems
  const totalProducts = items.reduce((sum, item) => sum + item.count, 0)

  return (
    <TaxonomyIndexPage
      carbonPathname="/product-types"
      title="Discover products by type"
      description="Browse launches by the way they are packaged, delivered, and used by customers."
      searchPlaceholder={`Search ${items.length.toLocaleString()} product types...`}
      itemsHeading="All Product Types"
      items={items}
      totalItems={items.length}
      pulseTitle="Product Type Pulse"
      pulseStats={[
        { label: "Active product types", value: items.length.toLocaleString() },
        { label: "Mapped products", value: totalProducts.toLocaleString() },
        {
          label: "Largest product type",
          value:
            [...items].sort((a, b) => b.count - a.count)[0]?.title ??
            "No product types yet",
        },
      ]}
      quickLinksTitle="Popular Product Types"
      emptyTitle="No product types yet"
      emptyDescription="Once products declare their type, this directory will populate automatically."
      structuredData={
        <CoreStructuredData
          scriptKeyPrefix="product-types"
          webPage={{ path: PRODUCT_TYPES_PATH, name: PAGE_TITLE }}
          breadcrumbs={{
            items: [
              { name: "Home", path: HOME_PATH },
              { name: PAGE_TITLE, path: PRODUCT_TYPES_PATH },
            ],
          }}
        />
      }
    />
  )
}
