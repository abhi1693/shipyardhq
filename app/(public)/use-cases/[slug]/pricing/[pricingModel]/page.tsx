import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import {
  getPublicUseCaseMeta,
  getPublicUseCasesWithCounts,
} from "@/actions/public/use-cases/actions"
import { ProductSlicePage } from "@/components/templates/public/pseo/ProductSlicePage"
import { buildPageMetadata } from "@/lib/metadata"
import {
  HOME_PATH,
  PRICING_PATH,
  USE_CASES_PATH,
  pricingModelPath,
  usecasePricingPath,
  usecasePath,
} from "@/lib/routes"
import { getPricingModelMeta, PRICING_MODEL_SLUGS } from "@/lib/pricing/models"
import {
  getProductSlicePayload,
  parsePseoSearchParams,
  pricingValueFromMaybe,
  pseoRobotsForTotal,
  type PseoSearchParams,
} from "@/lib/pseo/product-slices"

type UseCasePricingParams = {
  slug: string
  pricingModel: string
}

export async function generateStaticParams() {
  const useCases = await getPublicUseCasesWithCounts()

  return useCases
    .filter((useCase) => useCase.productCount > 0)
    .flatMap((useCase) =>
      PRICING_MODEL_SLUGS.map((pricingModel) => ({
        slug: useCase.slug,
        pricingModel,
      })),
    )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<UseCasePricingParams>
}): Promise<Metadata> {
  const { slug, pricingModel } = await params
  const useCase = await getPublicUseCaseMeta(slug)
  const pricing = getPricingModelMeta(pricingModel)
  if (!useCase || !pricing) return {}

  const total = await getProductSlicePayload({
    filters: {
      useCaseSlug: slug,
      pricingModel: pricing.value,
    },
    parsed: { sort: "new", page: 1, verified: false },
    pageSize: 1,
  }).then((payload) => payload.total)
  const title = `${pricing.label} tools to ${useCase.label.toLowerCase()}`
  const description = `Browse ${total} ${pricing.label.toLowerCase()} ${total === 1 ? "product" : "products"} for teams looking to ${useCase.label.toLowerCase()}.`
  const canonical = usecasePricingPath(slug, pricing.slug)

  return {
    ...buildPageMetadata({
      title,
      description,
      section: "Use Cases",
      canonical,
      openGraph: { title, description },
      twitter: { title, description },
    }),
    robots: pseoRobotsForTotal(total),
  }
}

export default function UseCasePricingPage(props: {
  params: Promise<UseCasePricingParams>
  searchParams: Promise<PseoSearchParams>
}) {
  return (
    <Suspense fallback={null}>
      <UseCasePricingPageContent {...props} />
    </Suspense>
  )
}

async function UseCasePricingPageContent({
  params,
  searchParams,
}: {
  params: Promise<UseCasePricingParams>
  searchParams: Promise<PseoSearchParams>
}) {
  const { slug, pricingModel } = await params
  const useCase = await getPublicUseCaseMeta(slug)
  const pricing = getPricingModelMeta(pricingModel)
  const pricingValue = pricingValueFromMaybe(pricingModel)
  if (!useCase || !pricing || !pricingValue) return notFound()

  const rawSearchParams = await searchParams
  const parsed = parsePseoSearchParams(rawSearchParams)
  const payload = await getProductSlicePayload({
    filters: {
      useCaseSlug: slug,
      pricingModel: pricingValue,
    },
    parsed,
  })

  const pagePath = usecasePricingPath(slug, pricing.slug)
  const title = `${pricing.label} tools to ${useCase.label.toLowerCase()}`
  const description = `Browse ${payload.total} ${pricing.label.toLowerCase()} ${payload.total === 1 ? "product" : "products"} for teams looking to ${useCase.label.toLowerCase()}.`

  return (
    <ProductSlicePage
      title={title}
      description={description}
      pagePath={pagePath}
      scriptKeyPrefix={`use-case-${slug}-pricing-${pricing.slug}`}
      breadcrumbs={[
        { name: "Home", path: HOME_PATH },
        { name: "Use Cases", path: USE_CASES_PATH },
        { name: useCase.label, path: usecasePath(slug) },
        { name: "Pricing", path: PRICING_PATH },
        { name: pricing.label, path: pricingModelPath(pricing.slug) },
      ]}
      products={payload.products}
      total={payload.total}
      hasMore={payload.hasMore}
      parsed={parsed}
      rawSearchParams={rawSearchParams}
      searchParams={{
        useCase: slug,
        pricingModel: pricing.slug,
      }}
      chips={[useCase.label, `${pricing.label} pricing`]}
      itemListName={title}
      itemListDescription={description}
      faqQualifier={`${pricing.label.toLowerCase()} tools to ${useCase.label.toLowerCase()}`}
    />
  )
}
