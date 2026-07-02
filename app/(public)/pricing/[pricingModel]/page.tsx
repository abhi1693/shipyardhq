import type { Metadata } from "next"
import { Suspense } from "react"

import { PricingModelPageContent } from "@/components/templates/public/pricing/pricing-model-page-content"
import {
  getPricingModelPagePayload,
  getPricingModelStaticParams,
} from "@/lib/pricing/page-cache"
import { getPricingModelMeta } from "@/lib/pricing/models"
import { buildPageMetadata } from "@/lib/metadata"
import {
  pseoCanonicalForTotal,
  pseoRobotsForTotal,
} from "@/lib/pseo/product-slices"
import { PRICING_PATH, pricingModelPath } from "@/lib/routes"
import { pluralize } from "@/lib/pluralize"

export function generateStaticParams() {
  return getPricingModelStaticParams()
}

export async function generateMetadata(
  props: Parameters<typeof PricingModelPageContent>[0],
): Promise<Metadata> {
  const { pricingModel } = await props.params
  const meta = getPricingModelMeta(pricingModel)
  if (!meta) return {}

  const payload = await getPricingModelPagePayload(meta.slug, {
    sort: "new",
    page: 1,
    verified: false,
  })

  const description = payload?.total
    ? `${payload.total} ${meta.label.toLowerCase()} ${pluralize(payload.total, "product")} to explore. ${meta.description}`
    : meta.description

  const metadata = buildPageMetadata({
    title: `${meta.label} pricing products`,
    description,
    section: "Pricing",
    canonical: pseoCanonicalForTotal(
      pricingModelPath(meta.slug),
      PRICING_PATH,
      payload?.total ?? 0,
    ),
  })

  return {
    ...metadata,
    robots: pseoRobotsForTotal(payload?.total ?? 0),
  }
}

export default function PricingModelPage(
  props: Parameters<typeof PricingModelPageContent>[0],
) {
  return (
    <Suspense fallback={null}>
      <PricingModelPageContent {...props} />
    </Suspense>
  )
}
