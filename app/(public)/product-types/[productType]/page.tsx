export const revalidate = 3600

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

export const generateStaticParams = getProductTypeStaticParams

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
    ? `${payload.total} ${meta.label.toLowerCase()} ${pluralize(payload.total, "product")} to explore. ${meta.description}`
    : meta.description

  const metadata = buildPageMetadata({
    title: `${meta.label} products`,
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
