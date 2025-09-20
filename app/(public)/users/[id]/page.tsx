import { notFound } from "next/navigation"
import type { Metadata } from "next"
import {
  getPublicUserMeta,
  getPublicUserProfile,
} from "@/actions/public/users/actions"
import PublicContainer from "@/components/layout/PublicContainer"
import { ProductCompactGrid } from "@/components/molecules/ProductCompactGrid"
import { EmptyState } from "@/components/molecules/empty-state"
import { buildPageMetadata } from "@/lib/metadata"

export const revalidate = 120

interface PageProps {
  params: Promise<{ id: string }>
}

type PublicUserProduct = NonNullable<
  Awaited<ReturnType<typeof getPublicUserProfile>>
>["products"][number]

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params
  const user = await getPublicUserMeta(id)
  if (!user) return {}
  const fullName =
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "User"
  const relativeUrl = `/users/${id}`
  const desc = `${fullName}'s published products on ShipYardHQ.`
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

export default async function PublicUserPage({ params }: PageProps) {
  const { id } = await params
  const user = await getPublicUserProfile(id)

  if (!user) return notFound()

  const fullName =
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "User"

  const items = (user.products || []).map((p: PublicUserProduct) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    logo: p.logo,
    tagline: p.tagline,
    analytics: p.analytics,
    user: { firstName: p.user.firstName, lastName: p.user.lastName },
    category: { name: p.category?.name },
    verification: p.verification,
    badges: (p.ProductBadge || [])
      .filter(
        (b: PublicUserProduct["ProductBadge"][number]) =>
          !b.expiresAt || new Date(b.expiresAt) > new Date(),
      )
      .map((b: PublicUserProduct["ProductBadge"][number]) => b.badge),
  }))

  const base = (
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ).replace(/\/$/, "")
  const profileUrl = `${base}/users/${user.id}`
  const ldPerson = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: fullName,
    url: profileUrl,
    identifier: user.id,
  }
  const ldItemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: `${base}/products/${p.slug}`,
    })),
  }
  const ldBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${base}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Users",
        item: `${base}/users`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: fullName,
        item: profileUrl,
      },
    ],
  }

  return (
    <PublicContainer paddingY="py-10" max="7xl" innerClassName="space-y-8">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldPerson) }}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldBreadcrumb) }}
      />
      {items.length > 0 && (
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ldItemList) }}
        />
      )}
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold">{fullName}</h1>
        <p className="text-muted-foreground">
          {items.length} published product{items.length === 1 ? "" : "s"}
        </p>
      </header>

      {items.length ? (
        <ProductCompactGrid items={items} />
      ) : (
        <EmptyState
          title="No published products yet"
          description="This user hasn’t published any products. Check back later."
        />
      )}
    </PublicContainer>
  )
}
