import type { Metadata } from "next"
import { Suspense } from "react"

import { BrowsePageContent } from "@/components/templates/public/browse/page-content"
import { BrowsePageSkeleton } from "@/components/templates/public/browse/skeleton"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { getPublicUseCaseMeta } from "@/actions/public/use-cases/actions"
import { buildPageMetadata } from "@/lib/metadata"
import {
  FILTERED_BROWSE_ROBOTS,
  hasBrowseSearchParams,
  isPlainUseCaseBrowseState,
} from "@/lib/browse/seo"
import { BROWSE_PATH, HOME_PATH, usecasePath } from "@/lib/routes"

const PAGE_TITLE = "Browse Products"

export const dynamic = "force-dynamic"

const baseMetadata = buildPageMetadata({
  title: PAGE_TITLE,
  description: "Explore tools, startups, and products by use case or category.",
})

const resolveSingle = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

export async function generateMetadata(
  props: Parameters<typeof BrowsePageContent>[0],
): Promise<Metadata> {
  const params = await props.searchParams
  const useCaseSlug = resolveSingle(params.useCase)
  const robots = hasBrowseSearchParams(params)
    ? FILTERED_BROWSE_ROBOTS
    : undefined

  if (
    useCaseSlug &&
    useCaseSlug !== "__all__" &&
    isPlainUseCaseBrowseState(params)
  ) {
    const useCaseMeta = await getPublicUseCaseMeta(useCaseSlug)
    if (useCaseMeta && useCaseMeta.productCount > 0) {
      return {
        ...baseMetadata,
        alternates: { canonical: usecasePath(useCaseMeta.slug) },
        robots,
      }
    }
  }

  return {
    ...baseMetadata,
    alternates: { canonical: BROWSE_PATH },
    robots,
  }
}

export default function BrowsePage(
  props: Parameters<typeof BrowsePageContent>[0],
) {
  return (
    <>
      <CoreStructuredData
        scriptKeyPrefix="browse"
        webPage={{ path: BROWSE_PATH, name: PAGE_TITLE }}
        breadcrumbs={{
          items: [
            { name: "Home", path: HOME_PATH },
            { name: PAGE_TITLE, path: BROWSE_PATH },
          ],
        }}
      />
      <Suspense fallback={<BrowsePageSkeleton />}>
        <BrowsePageContent {...props} />
      </Suspense>
    </>
  )
}
