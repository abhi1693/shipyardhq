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
  pseoCanonicalForTotal,
  pseoRobotsForTotal,
  type PseoSearchParams,
} from "@/lib/pseo/product-slices"
import { buildUseCasePlatformMatrixCopy } from "@/lib/pseo/matrix-copy"

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
  const { title, description } = buildUseCasePlatformMatrixCopy({
    useCaseLabel: useCase.label,
    platformLabel: platformMeta.label,
    total,
  })
  const canonical = pseoCanonicalForTotal(
    usecasePlatformPath(slug, platformMeta.slug),
    usecasePath(slug),
    total,
  )

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
  const { title, description } = buildUseCasePlatformMatrixCopy({
    useCaseLabel: useCase.label,
    platformLabel: platformMeta.label,
    total: payload.total,
  })

  return (
    <ProductSlicePage
      title={title}
      description={description}
      intro={`This use-case platform slice focuses on products that help teams ${useCase.label.toLowerCase()} while fitting ${platformMeta.label} workflows. Use it to compare platform compatibility, launch recency, verification, and public traction without leaving the use-case context.`}
      pagePath={pagePath}
      scriptKeyPrefix={`use-case-${slug}-platform-${platformMeta.slug}`}
      breadcrumbs={[
        { name: "Home", path: HOME_PATH },
        { name: "Use Cases", path: USE_CASES_PATH },
        { name: useCase.label, path: usecasePath(slug) },
        { name: "Platforms", path: PLATFORMS_PATH },
        { name: platformMeta.label, path: platformPath(platformMeta.slug) },
      ]}
      relatedLinks={[
        {
          label: useCase.label,
          href: usecasePath(slug),
          description: `Browse every product for teams looking to ${useCase.label.toLowerCase()}.`,
        },
        {
          label: `${platformMeta.label} products`,
          href: platformPath(platformMeta.slug),
          description: `Compare all Shipyard products that support ${platformMeta.label}.`,
        },
        {
          label: "Platforms",
          href: PLATFORMS_PATH,
          description: "Browse product directories by supported platform.",
        },
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
