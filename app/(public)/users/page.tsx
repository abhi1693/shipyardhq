import { Suspense } from "react"

import {
  UsersIndexPageContent,
  metadata,
  revalidate,
} from "@/components/templates/public/users/index/page-content"
import { UsersIndexSkeleton } from "@/components/templates/public/users/index/skeleton"

export { metadata, revalidate }

export default function UsersIndexPage() {
  return (
    <Suspense fallback={<UsersIndexSkeleton />}>
      <UsersIndexPageContent />
    </Suspense>
  )
}
