import type { Metadata } from "next"
import { Suspense } from "react"

import {
  UseCasePageContent,
} from "@/components/templates/public/use-cases/detail/page-content"
import { UseCaseDetailSkeleton } from "@/components/templates/public/use-cases/detail/skeleton"
import { getPublicUseCaseMeta } from "@/actions/public/use-cases/actions"
import { buildPageMetadata } from "@/lib/metadata"
import { pluralize } from "@/lib/pluralize"
import { getUseCaseStaticParams } from "@/lib/useCases/page-cache"

export const generateStaticParams = getUseCaseStaticParams

export async function generateMetadata(
  props: Parameters<typeof UseCasePageContent>[0],
): Promise<Metadata> {
  const { slug } = await props.params
  const useCase = await getPublicUseCaseMeta(slug)
  if (!useCase || useCase.productCount === 0) return {}

  const description = `Explore ${useCase.productCount} ${pluralize(
    useCase.productCount,
    "product",
  )} built for ${useCase.label}.`

  return buildPageMetadata({
    title: `${useCase.label} Use Case`,
    section: "Use Cases",
    description,
  })
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
