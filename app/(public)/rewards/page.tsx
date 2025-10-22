import { Suspense } from "react"

import {
  RewardsPageContent,
  metadata,
} from "@/components/templates/public/rewards/page-content"
import { RewardsPageSkeleton } from "@/components/templates/public/rewards/skeleton"

export { metadata }

export default function RewardsExplainerPage() {
  return (
    <Suspense fallback={<RewardsPageSkeleton />}>
      <RewardsPageContent />
    </Suspense>
  )
}
