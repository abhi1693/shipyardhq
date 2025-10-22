import { Suspense } from "react"

import { UsersIndexPageContent } from "@/components/templates/public/users/index/page-content"
import { UsersIndexSkeleton } from "@/components/templates/public/users/index/skeleton"
import type { Metadata } from "next"
import { buildPageMetadata } from "@/lib/metadata"
import { USERS_PATH } from "@/lib/routes"

export const revalidate = 120

const baseMetadata = buildPageMetadata({
  title: "Makers — Shipyard",
  description:
    "Explore Shipyard makers, see what they have launched, and discover who is building momentum right now.",
  openGraph: {
    url: USERS_PATH,
    type: "website",
  },
  twitter: {
    card: "summary",
  },
})

export const metadata: Metadata = {
  ...baseMetadata,
  alternates: { canonical: USERS_PATH },
}

export default function UsersIndexPage() {
  return (
    <Suspense fallback={<UsersIndexSkeleton />}>
      <UsersIndexPageContent />
    </Suspense>
  )
}
