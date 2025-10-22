import { Suspense } from "react"

import {
  MemberNotificationsPageContent,
  MemberNotificationsPageSkeleton,
} from "@/components/templates/member/notifications/page-content"
import { buildPageMetadata } from "@/lib/metadata"

export const dynamic = "force-dynamic"

export const metadata = buildPageMetadata({
  title: "Notifications",
  description: "Stay on top of product activity and reward updates.",
})

export default function MemberNotificationsPage() {
  return (
    <Suspense fallback={<MemberNotificationsPageSkeleton />}>
      <MemberNotificationsPageContent />
    </Suspense>
  )
}
