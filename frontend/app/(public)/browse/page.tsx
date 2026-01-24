import type { Metadata } from "next"
import { Suspense } from "react"

import { BrowsePageContent } from "@/components/templates/public/browse/page-content"
import { BrowsePageSkeleton } from "@/components/templates/public/browse/skeleton"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { getUseCaseMetaApiV1PublicUseCasesSlugMetaGet } from "@/lib/generated/fastapi/public-homepage"
import { buildPageMetadata } from "@/lib/metadata"
import { BROWSE_PATH, HOME_PATH, usecasePath } from "@/lib/routes"

const PAGE_TITLE = "Browse Products"

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

  if (useCaseSlug && useCaseSlug !== "__all__") {
    try {
      const response =
        await getUseCaseMetaApiV1PublicUseCasesSlugMetaGet(useCaseSlug)
      const useCaseMeta = response.data
      if (useCaseMeta && useCaseMeta.productCount > 0) {
        return {
          ...baseMetadata,
          alternates: { canonical: usecasePath(useCaseMeta.slug) },
        }
      }
    } catch {
      // ignore invalid use case slugs
    }
  }

  return {
    ...baseMetadata,
    alternates: { canonical: BROWSE_PATH },
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
