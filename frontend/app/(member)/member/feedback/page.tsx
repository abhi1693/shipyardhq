import { Suspense } from "react"

import {
  MemberFeedbackPageContent,
  MemberFeedbackPageSkeleton,
} from "@/components/templates/member/feedback/page-content"
import { buildPageMetadata } from "@/lib/metadata"

export const metadata = buildPageMetadata({
  title: "Feedback",
  description: "Share feedback with the Shipyard crew.",
})

export default function MemberFeedbackPage() {
  return (
    <Suspense fallback={<MemberFeedbackPageSkeleton />}>
      <MemberFeedbackPageContent />
    </Suspense>
  )
}
