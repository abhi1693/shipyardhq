import { Suspense } from "react"

import {
  RankInPublicPageContent,
  metadata,
  dynamic,
} from "@/components/templates/public/rank-in-public/page-content"
import { RankInPublicSkeleton } from "@/components/templates/public/rank-in-public/skeleton"

export { metadata, dynamic }

export default function RankInPublicPage() {
  return (
    <Suspense fallback={<RankInPublicSkeleton />}>
      <RankInPublicPageContent />
    </Suspense>
  )
}
