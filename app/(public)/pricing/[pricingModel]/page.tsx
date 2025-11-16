export const revalidate = 3600

import type { Metadata } from "next"

import { PricingModelPageContent } from "@/components/templates/public/pricing/pricing-model-page-content"
import {
  getPricingModelPagePayload,
  getPricingModelStaticParams,
} from "@/lib/pricing/page-cache"
import { getPricingModelMeta } from "@/lib/pricing/models"
import { buildPageMetadata } from "@/lib/metadata"
import { pricingModelPath } from "@/lib/routes"
import { pluralize } from "@/lib/pluralize"

export const generateStaticParams = getPricingModelStaticParams

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
  })

  return {
    ...metadata,
    alternates: { canonical: pricingModelPath(meta.slug) },
  }
}

export default function PricingModelPage(
  props: Parameters<typeof PricingModelPageContent>[0],
) {
  return <PricingModelPageContent {...props} />
}

