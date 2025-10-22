import type { Metadata } from "next"
import { Suspense } from "react"

import { UserProfilePageContent } from "@/components/templates/public/users/detail/page-content"
import { UserProfileSkeleton } from "@/components/templates/public/users/detail/skeleton"
import { getPublicUserMeta } from "@/actions/public/users/actions"
import { buildPageMetadata } from "@/lib/metadata"
import { userPath } from "@/lib/routes"

export const revalidate = 120

export async function generateMetadata(
  props: Parameters<typeof UserProfilePageContent>[0],
): Promise<Metadata> {
  const { id } = await props.params
  const user = await getPublicUserMeta(id)
  if (!user) return {}

  const fullName =
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "User"
  const relativeUrl = userPath(id)
  const desc = `${fullName}'s published products on Shipyard.`
  const baseMetadata = buildPageMetadata({
    title: fullName,
    section: "Profile",
    description: desc,
    openGraph: {
      url: relativeUrl,
      type: "profile",
    },
    twitter: {
      card: "summary",
    },
  })

  return {
    ...baseMetadata,
    alternates: { canonical: relativeUrl },
  }
}

export default function MakerProfilePage(
  props: Parameters<typeof UserProfilePageContent>[0],
) {
  return (
    <Suspense fallback={<UserProfileSkeleton />}>
      <UserProfilePageContent {...props} />
    </Suspense>
  )
}
