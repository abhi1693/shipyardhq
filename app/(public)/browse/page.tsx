import type { Metadata } from "next"
import { Suspense } from "react"

import { BrowsePageContent } from "@/components/templates/public/browse/page-content"
import { BrowsePageSkeleton } from "@/components/templates/public/browse/skeleton"
import { getPublicUseCaseMeta } from "@/actions/public/use-cases/actions"
import { buildPageMetadata } from "@/lib/metadata"
import { BROWSE_PATH, usecasePath } from "@/lib/routes"

const baseMetadata = buildPageMetadata({
  title: "Browse Products",
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
    const useCaseMeta = await getPublicUseCaseMeta(useCaseSlug)
    if (useCaseMeta && useCaseMeta.productCount > 0) {
      return {
        ...baseMetadata,
        alternates: { canonical: usecasePath(useCaseMeta.slug) },
      }
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
    <Suspense fallback={<BrowsePageSkeleton />}>
      <BrowsePageContent {...props} />
    </Suspense>
  )
}
