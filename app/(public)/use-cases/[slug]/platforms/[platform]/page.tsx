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
  PLATFORMS_PATH,
  USE_CASES_PATH,
  platformPath,
  usecasePlatformPath,
  usecasePath,
} from "@/lib/routes"
import { PLATFORM_SLUGS, getPlatformMeta } from "@/lib/platforms/config"
import {
  getProductSlicePayload,
  parsePseoSearchParams,
  platformValueFromMaybe,
  pseoRobotsForTotal,
  type PseoSearchParams,
} from "@/lib/pseo/product-slices"

type UseCasePlatformParams = {
  slug: string
  platform: string
}

export async function generateStaticParams() {
  const useCases = await getPublicUseCasesWithCounts()

  return useCases
    .filter((useCase) => useCase.productCount > 0)
    .flatMap((useCase) =>
      PLATFORM_SLUGS.map((platform) => ({
        slug: useCase.slug,
        platform,
      })),
    )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<UseCasePlatformParams>
}): Promise<Metadata> {
  const { slug, platform } = await params
  const useCase = await getPublicUseCaseMeta(slug)
  const platformMeta = getPlatformMeta(platform)
  if (!useCase || !platformMeta) return {}

  const total = await getProductSlicePayload({
    filters: {
      useCaseSlug: slug,
      platform: platformMeta.value,
    },
    parsed: { sort: "new", page: 1, verified: false },
    pageSize: 1,
  }).then((payload) => payload.total)
  const title = `${platformMeta.label} tools to ${useCase.label.toLowerCase()}`
  const description = `Browse ${total} ${platformMeta.label} ${total === 1 ? "product" : "products"} for teams looking to ${useCase.label.toLowerCase()}.`
  const canonical = usecasePlatformPath(slug, platformMeta.slug)

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

export default function UseCasePlatformPage(props: {
  params: Promise<UseCasePlatformParams>
  searchParams: Promise<PseoSearchParams>
}) {
  return (
    <Suspense fallback={null}>
      <UseCasePlatformPageContent {...props} />
    </Suspense>
  )
}

async function UseCasePlatformPageContent({
  params,
  searchParams,
}: {
  params: Promise<UseCasePlatformParams>
  searchParams: Promise<PseoSearchParams>
}) {
  const { slug, platform } = await params
  const useCase = await getPublicUseCaseMeta(slug)
  const platformMeta = getPlatformMeta(platform)
  const platformValue = platformValueFromMaybe(platform)
  if (!useCase || !platformMeta || !platformValue) return notFound()

  const rawSearchParams = await searchParams
  const parsed = parsePseoSearchParams(rawSearchParams)
  const payload = await getProductSlicePayload({
    filters: {
      useCaseSlug: slug,
      platform: platformValue,
    },
    parsed,
  })

  const pagePath = usecasePlatformPath(slug, platformMeta.slug)
  const title = `${platformMeta.label} tools to ${useCase.label.toLowerCase()}`
  const description = `Browse ${payload.total} ${platformMeta.label} ${payload.total === 1 ? "product" : "products"} for teams looking to ${useCase.label.toLowerCase()}.`

  return (
    <ProductSlicePage
      title={title}
      description={description}
      pagePath={pagePath}
      scriptKeyPrefix={`use-case-${slug}-platform-${platformMeta.slug}`}
      breadcrumbs={[
        { name: "Home", path: HOME_PATH },
        { name: "Use Cases", path: USE_CASES_PATH },
        { name: useCase.label, path: usecasePath(slug) },
        { name: "Platforms", path: PLATFORMS_PATH },
        { name: platformMeta.label, path: platformPath(platformMeta.slug) },
      ]}
      products={payload.products}
      total={payload.total}
      hasMore={payload.hasMore}
      parsed={parsed}
      rawSearchParams={rawSearchParams}
      searchParams={{
        useCase: slug,
        platform: platformMeta.slug,
      }}
      chips={[useCase.label, platformMeta.label]}
      itemListName={title}
      itemListDescription={description}
      faqQualifier={`${platformMeta.label} tools to ${useCase.label.toLowerCase()}`}
    />
  )
}
