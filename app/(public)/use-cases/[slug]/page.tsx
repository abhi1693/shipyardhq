import { Suspense } from "react"

import {
  UseCasePageContent,
  generateMetadata,
  generateStaticParams,
} from "@/components/templates/public/use-cases/detail/page-content"
import { UseCaseDetailSkeleton } from "@/components/templates/public/use-cases/detail/skeleton"

export { generateMetadata, generateStaticParams }

export default function UseCasePage(
  props: Parameters<typeof UseCasePageContent>[0],
) {
  return (
    <Suspense fallback={<UseCaseDetailSkeleton />}>
      <UseCasePageContent {...props} />
    </Suspense>
  )
}
