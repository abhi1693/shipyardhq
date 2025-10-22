import { Suspense } from "react"

import {
  MemberOrganizationsPageContent,
  MemberOrganizationsPageSkeleton,
} from "@/components/templates/member/organizations/page-content"
import { buildPageMetadata } from "@/lib/metadata"

export const metadata = buildPageMetadata({
  title: "Organizations",
  description: "Manage your organizations.",
})

export default function MemberOrganizationsPage(
  props: Parameters<typeof MemberOrganizationsPageContent>[0],
) {
  return (
    <Suspense fallback={<MemberOrganizationsPageSkeleton />}>
      <MemberOrganizationsPageContent {...props} />
    </Suspense>
  )
}
