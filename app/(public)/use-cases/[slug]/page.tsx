import type { Metadata } from "next"
import { Suspense } from "react"

import { UseCasePageContent } from "@/components/templates/public/use-cases/detail/page-content"
import { TaxonomyDetailSkeleton } from "@/components/templates/public/common/TaxonomyDetailSkeleton"
import { getPublicUseCaseMeta } from "@/actions/public/use-cases/actions"
import { buildMetaDescription, buildPageMetadata } from "@/lib/metadata"
import { pluralize } from "@/lib/pluralize"
import { usecasePath } from "@/lib/routes"

export const dynamic = "force-dynamic"

export async function generateMetadata(
  props: Parameters<typeof UseCasePageContent>[0],
): Promise<Metadata> {
  const { slug } = await props.params
  const useCase = await getPublicUseCaseMeta(slug)
  if (!useCase) return {}

  const countLabel = `${useCase.productCount.toLocaleString("en-US")} ${pluralize(
    useCase.productCount,
    "product",
  )}`
  const fallbackDescription = `Explore ${countLabel} built for ${useCase.label}. Discover launch-ready tools, compare makers, and find products for this use case on Shipyard.`
  const description = buildMetaDescription(
    `${useCase.label} use case products on Shipyard: ${countLabel} curated for launch planning, SaaS workflows, maker research, and product discovery.`,
    fallbackDescription,
  )
  const canonical = usecasePath(useCase.slug)

  return buildPageMetadata({
    title: `${useCase.label} Use Case`,
    section: "Use Cases",
    description,
    canonical,
    openGraph: {
      url: canonical,
      description,
    },
    twitter: {
      description,
    },
  })
}

export default function UseCasePage(
  props: Parameters<typeof UseCasePageContent>[0],
) {
  return (
    <Suspense fallback={<TaxonomyDetailSkeleton />}>
      <UseCasePageContent {...props} />
    </Suspense>
  )
}
