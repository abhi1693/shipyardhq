import type { Metadata } from "next"
import { Suspense } from "react"
import { JsonLdScript } from "next-seo"

import { UserProfilePageContent } from "@/components/templates/public/users/detail/page-content"
import { UserProfileSkeleton } from "@/components/templates/public/users/detail/skeleton"
import { getPublicUserMeta } from "@/actions/public/users/actions"
import { getUserProfilePayload } from "@/lib/users/page-cache"
import { getClerkUserByIdCached } from "@/lib/server/clerkUsers"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { buildProfilePageJsonLd } from "@/lib/seo/profile-page"
import { buildPageMetadata } from "@/lib/metadata"
import { HOME_PATH, USERS_PATH, userPath } from "@/lib/routes"

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
  const paramsPromise = props.params
  return (
    <Suspense fallback={<UserProfileSkeleton />}>
      <ProfileStructuredData params={paramsPromise} />
      <UserProfilePageContent {...props} />
    </Suspense>
  )
}

async function ProfileStructuredData({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const payload = await getUserProfilePayload(id)
  if (!payload) return null

  const fullName =
    `${payload.profile.firstName ?? ""} ${payload.profile.lastName ?? ""}`.trim() ||
    "Shipyard maker"

  let avatarUrl: string | null = null
  if (payload.profile.clerkId) {
    try {
      const clerkUser = await getClerkUserByIdCached(payload.profile.clerkId)
      avatarUrl = clerkUser.imageUrl ?? null
    } catch {
      avatarUrl = null
    }
  }

  const profilePath = userPath(id)
  const baseBreadcrumbs = [
    { name: "Home", path: HOME_PATH },
    { name: "Makers", path: USERS_PATH },
    { name: fullName, path: profilePath },
  ]
  const structuredData = buildProfilePageJsonLd({
    profileId: id,
    fullName,
    profilePath,
    avatarUrl,
    products: payload.productsPage.items.map((product) => ({
      slug: product.slug,
    })),
    breadcrumbs: baseBreadcrumbs,
  })

  return (
    <>
      <CoreStructuredData
        scriptKeyPrefix={`user-${id}`}
        webPage={{ path: profilePath, name: fullName }}
        breadcrumbs={{ items: baseBreadcrumbs }}
      />
      <JsonLdScript
        data={structuredData.person}
        scriptKey={`user-${id}-person`}
      />
      {structuredData.products ? (
        <JsonLdScript
          data={structuredData.products}
          scriptKey={`user-${id}-products`}
        />
      ) : null}
    </>
  )
}
