import { Suspense } from "react"

import {
  UserProfilePageContent,
  generateMetadata,
  revalidate,
} from "@/components/templates/public/users/detail/page-content"
import { UserProfileSkeleton } from "@/components/templates/public/users/detail/skeleton"

export { generateMetadata, revalidate }

export default function MakerProfilePage(
  props: Parameters<typeof UserProfilePageContent>[0],
) {
  return (
    <Suspense fallback={<UserProfileSkeleton />}>
      <UserProfilePageContent {...props} />
    </Suspense>
  )
}
