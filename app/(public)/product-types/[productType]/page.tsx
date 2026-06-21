import type { Metadata } from "next"

import { ProductTypePageContent } from "@/components/templates/public/product-types/product-type-page-content"
import {
  getProductTypePagePayload,
  getProductTypeStaticParams,
} from "@/lib/product-types/page-cache"
import { getProductTypeMeta } from "@/lib/product-types/models"
import { buildPageMetadata } from "@/lib/metadata"
import { productTypePath } from "@/lib/routes"
import { pluralize } from "@/lib/pluralize"
import { BRAND_NAME } from "@/lib/brand"

export const revalidate = 300
export const dynamicParams = true

export function generateStaticParams() {
  return getProductTypeStaticParams()
}

export async function generateMetadata(
  props: Parameters<typeof ProductTypePageContent>[0],
): Promise<Metadata> {
  const { productType } = await props.params
  const meta = getProductTypeMeta(productType)
  if (!meta) return {}

  const payload = await getProductTypePagePayload(meta.slug, {
    sort: "new",
    page: 1,
    verified: false,
  })

  const description = payload?.total
    ? `Explore ${payload.total} ${meta.label.toLowerCase()} ${pluralize(payload.total, "product")} launching on ${BRAND_NAME}. ${meta.description}`
    : `Explore ${meta.label.toLowerCase()} product launches on ${BRAND_NAME}. ${meta.description}`

  const metadata = buildPageMetadata({
    title: `${meta.label} products and launches`,
    description,
    section: "Products",
  })

  return {
    ...metadata,
    alternates: { canonical: productTypePath(meta.slug) },
  }
}

export default function ProductTypePage(
  props: Parameters<typeof ProductTypePageContent>[0],
) {
  return <ProductTypePageContent {...props} />
}
