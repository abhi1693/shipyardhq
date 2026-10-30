import {
  directoryPagePath,
  parseDirectoryPage,
} from "@/lib/directory/pagination"
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

const PAGE_TITLE = "App Directory"

const baseMetadata = buildPageMetadata({
  title: PAGE_TITLE,
  description:
    "Browse product launches, SaaS tools, mobile apps, APIs, AI products, and startup projects by use case or category.",
  canonical: BROWSE_PATH,
})

const resolveSingle = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

export async function generateMetadata(
  props: Parameters<typeof BrowsePageContent>[0],
): Promise<Metadata> {
  const params = await props.searchParams
  const useCaseSlug = resolveSingle(params.useCase)
  const page = parseDirectoryPage(params.page)
  const nonPageParams = Object.fromEntries(
    Object.entries(params).filter(([key]) => key !== "page"),
  )
  const robots =
    page === null || hasBrowseSearchParams(nonPageParams)
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
        ...buildPageMetadata({
          title: PAGE_TITLE,
          description:
            "Browse product launches, SaaS tools, mobile apps, APIs, AI products, and startup projects by use case or category.",
          canonical: usecasePath(useCaseMeta.slug),
        }),
        robots,
      }
    }
  }

  return {
    ...baseMetadata,
    ...(page && page > 1
      ? buildPageMetadata({
          title: PAGE_TITLE,
          description:
            "Browse product launches, SaaS tools, mobile apps, APIs, AI products, and startup projects by use case or category.",
          canonical: directoryPagePath(BROWSE_PATH, page),
        })
      : {}),
    robots,
  }
}

export default function BrowsePage(
  props: Parameters<typeof BrowsePageContent>[0],
) {
  return (
    <>
      <Suspense fallback={<BrowsePageSkeleton />}>
        <BrowseStructuredData searchParams={props.searchParams} />
        <BrowsePageContent {...props} />
      </Suspense>
    </>
  )
}

async function BrowseStructuredData({
  searchParams,
}: Parameters<typeof BrowsePageContent>[0]) {
  const params = await searchParams
  const page = parseDirectoryPage(params.page)
  if (page === null) return null
  const path = directoryPagePath(BROWSE_PATH, page)
  return (
    <CoreStructuredData
      scriptKeyPrefix="browse"
      webPage={{ path, name: PAGE_TITLE }}
      breadcrumbs={{
        items: [
          { name: "Home", path: HOME_PATH },
          { name: PAGE_TITLE, path: BROWSE_PATH },
        ],
      }}
    />
  )
}
