import { Suspense } from "react"

import { UsersIndexPageContent } from "@/components/templates/public/users/index/page-content"
import { UsersIndexSkeleton } from "@/components/templates/public/users/index/skeleton"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import type { Metadata } from "next"
import { buildPageMetadata } from "@/lib/metadata"
import { HOME_PATH, USERS_PATH } from "@/lib/routes"

const PAGE_TITLE = "Makers — Shipyard"

const baseMetadata = buildPageMetadata({
  title: PAGE_TITLE,
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
    <>
      <CoreStructuredData
        scriptKeyPrefix="users"
        webPage={{ path: USERS_PATH, name: PAGE_TITLE }}
        breadcrumbs={{
          items: [
            { name: "Home", path: HOME_PATH },
            { name: PAGE_TITLE, path: USERS_PATH },
          ],
        }}
      />
      <Suspense fallback={<UsersIndexSkeleton />}>
        <UsersIndexPageContent />
      </Suspense>
    </>
  )
}
