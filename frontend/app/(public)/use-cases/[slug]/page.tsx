import type { Metadata } from "next"
import { Suspense } from "react"

import { UseCasePageContent } from "@/components/templates/public/use-cases/detail/page-content"
import { UseCaseDetailSkeleton } from "@/components/templates/public/use-cases/detail/skeleton"
import { getUseCaseMetaApiV1PublicUseCasesSlugMetaGet } from "@/lib/generated/fastapi/public-homepage"
import { buildPageMetadata } from "@/lib/metadata"
import { pluralize } from "@/lib/pluralize"

export const dynamic = "force-dynamic"

export async function generateMetadata(
  props: Parameters<typeof UseCasePageContent>[0],
): Promise<Metadata> {
  const { slug } = await props.params
  try {
    const response = await getUseCaseMetaApiV1PublicUseCasesSlugMetaGet(slug)
    if (response.status !== 200) {
      return {}
    }
    const useCase = response.data
    const productCount = useCase.productCount ?? 0
    if (!useCase || productCount === 0) return {}

    const description = `Explore ${productCount} ${pluralize(
      productCount,
      "product",
    )} built for ${useCase.label}.`

    return buildPageMetadata({
      title: `${useCase.label} Use Case`,
      section: "Use Cases",
      description,
    })
  } catch {
    return {}
  }
}

export default function UseCasePage(
  props: Parameters<typeof UseCasePageContent>[0],
) {
  return (
    <Suspense fallback={<UseCaseDetailSkeleton />}>
      <UseCasePageContent {...props} />
    </Suspense>
  )
}
