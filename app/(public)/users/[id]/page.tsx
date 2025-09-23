import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { format } from "date-fns"
import { ArrowUpRight } from "lucide-react"
import {
  getPublicUserMeta,
  getPublicUserProfile,
} from "@/actions/public/users/actions"
import PublicContainer from "@/components/layout/PublicContainer"
import { ProductCompactGrid } from "@/components/molecules/ProductCompactGrid"
import { EmptyState } from "@/components/molecules/empty-state"
import CopyButton from "@/components/molecules/CopyButton"
import ShareProfileButton from "@/components/molecules/ShareProfileButton"
import { buildPageMetadata } from "@/lib/metadata"
import { HOME_PATH, USERS_PATH, productPath, userPath } from "@/lib/routes"

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
  const relativeUrl = userPath(id)
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

  const products = user.products || []
  const now = new Date()
  const categorySet = new Set<string>()
  const badgeSet = new Set<string>()
  let verifiedCount = 0
  let totalUpvotes = 0

  const items = products.map((p: PublicUserProduct) => {
    const upvotes = p.analytics?.upvotes ?? 0
    totalUpvotes += upvotes

    if (p.verification?.isVerified) {
      verifiedCount += 1
    }

    if (p.category?.name) {
      categorySet.add(p.category.name)
    }

    const activeBadges = (p.ProductBadge || [])
      .filter(
        (b: PublicUserProduct["ProductBadge"][number]) =>
          !b.expiresAt || new Date(b.expiresAt) > now,
      )
      .map((b: PublicUserProduct["ProductBadge"][number]) => {
        badgeSet.add(b.badge)
        return b.badge
      })

    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      logo: p.logo,
      tagline: p.tagline,
      analytics: p.analytics,
      user: { firstName: p.user.firstName, lastName: p.user.lastName },
      category: { name: p.category?.name },
      verification: p.verification,
      badges: activeBadges,
      createdAt: p.createdAt,
      publishedAt: p.publishedAt,
      websiteUrl: p.websiteUrl,
    }
  })

  const categories = Array.from(categorySet)
  const uniqueBadges = Array.from(badgeSet)
  const firstPublishedAt = items.reduce<Date | null>((earliest, product) => {
    const timestamp = product.publishedAt ?? product.createdAt
    if (!timestamp) return earliest
    if (!earliest || timestamp < earliest) return timestamp
    return earliest
  }, null)
  const highlightItem = items.reduce<(typeof items)[number] | null>(
    (best, current) => {
      if (!best) return current
      const bestUpvotes = best.analytics?.upvotes ?? 0
      const currentUpvotes = current.analytics?.upvotes ?? 0
      if (currentUpvotes > bestUpvotes) return current
      if (currentUpvotes === bestUpvotes) {
        const bestDate = best.publishedAt ?? best.createdAt
        const currentDate = current.publishedAt ?? current.createdAt
        if (currentDate && bestDate && currentDate > bestDate) {
          return current
        }
      }
      return best
    },
    null,
  )
  const totalProducts = items.length
  const featuredCategories = categories.slice(0, 4)
  const extraCategories = Math.max(
    categories.length - featuredCategories.length,
    0,
  )
  const statFormatter = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  })
  const stats = [
    { label: "Published products", value: totalProducts },
    { label: "Total upvotes", value: totalUpvotes },
    { label: "Verified launches", value: verifiedCount },
    { label: "Focus categories", value: categories.length },
  ]
  const initials =
    fullName
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2) || "BU"
  const builderSinceLabel = firstPublishedAt
    ? `Building on Shipyard since ${format(firstPublishedAt, "MMMM yyyy")}.`
    : null
  const summaryParts: string[] = []
  if (builderSinceLabel) summaryParts.push(builderSinceLabel)
  if (categories.length) {
    summaryParts.push(
      `Focus areas: ${featuredCategories.join(", ")}${
        extraCategories ? ` (+${extraCategories} more)` : ""
      }.`,
    )
  }
  if (uniqueBadges.length) {
    summaryParts.push(
      `Earned ${uniqueBadges.length} badge${uniqueBadges.length === 1 ? "" : "s"} across launches.`,
    )
  }
  if (!summaryParts.length) {
    summaryParts.push(
      totalProducts
        ? `${fullName} is shipping products with the Shipyard community.`
        : "This builder hasn’t published any products yet. Check back soon for their first launch.",
    )
  }
  const profileSummary = summaryParts.join(" ")
  const highlightBadges = highlightItem?.badges?.slice(0, 2) ?? []
  const highlightBadgeOverflow = Math.max(
    (highlightItem?.badges?.length ?? 0) - highlightBadges.length,
    0,
  )
  const profilePath = userPath(user.id)

  const base = (
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ).replace(/\/$/, "")
  const profileUrl = `${base}${profilePath}`
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
      item: `${base}${productPath(p.slug)}`,
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
        item: `${base}${HOME_PATH}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Users",
        item: `${base}${USERS_PATH}`,
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
      <section className="relative isolate overflow-hidden rounded-[32px] border border-[color:var(--brand-1)/0.22] bg-background/92 px-6 py-12 shadow-[0_40px_120px_-80px_rgba(7,58,104,0.75)] backdrop-blur sm:px-10 md:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-30 bg-[linear-gradient(180deg,rgba(246,250,255,0.9),rgba(236,245,253,0.88)55%,rgba(229,240,250,0.92))] dark:bg-[linear-gradient(180deg,rgba(4,16,34,0.92),rgba(6,22,42,0.9)55%,rgba(9,32,55,0.9))]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(120%_85%_at_6%_0%,var(--brand-1)/0.22,transparent_68%),radial-gradient(95%_95%_at_95%_-10%,var(--brand-2)/0.18,transparent_75%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(10,52,88,0.12) 1px, transparent 1px), linear-gradient(180deg, rgba(10,52,88,0.12) 1px, transparent 1px)",
            backgroundSize: "140px 140px",
            maskImage:
              "radial-gradient(80% 120% at 50% 0%, rgba(0,0,0,0.9), transparent 72%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 -z-10 h-44 bg-gradient-to-t from-[color:var(--brand-1)/0.24] via-transparent to-transparent"
        />

        <div className="relative flex flex-col gap-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4 md:gap-6">
              <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border border-[color:var(--brand-1)/0.35] bg-[color:var(--brand-1)/0.12] text-2xl font-semibold text-[color:var(--brand-1)] shadow-[0_22px_48px_-34px_rgba(7,58,104,0.75)] md:h-20 md:w-20 md:text-3xl">
                {initials}
              </span>
              <div className="space-y-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brand-2)/0.4] bg-background/80 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-2)] shadow-[0_16px_40px_-30px_rgba(7,58,104,0.65)]">
                  Builder Profile
                </span>
                <h1 className="bg-[linear-gradient(92deg,var(--brand-1),var(--brand-2),var(--brand-3))] bg-clip-text text-3xl font-semibold leading-tight text-transparent sm:text-4xl md:text-5xl">
                  {fullName}
                </h1>
                <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
                  {profileSummary}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <CopyButton
                text={profilePath}
                resolveAbsolute
                size="sm"
                variant="outline"
                className="border-[color:var(--brand-1)/0.35] bg-background/70 text-[color:var(--brand-1)] shadow-[0_18px_40px_-32px_rgba(7,58,104,0.75)]"
              >
                Copy profile link
              </CopyButton>
              <ShareProfileButton
                path={profilePath}
                fullName={fullName}
                productCount={totalProducts}
                className="border-[color:var(--brand-2)/0.35] bg-background/70 text-[color:var(--brand-2)] shadow-[0_18px_40px_-32px_rgba(7,58,104,0.7)]"
              />
            </div>
          </div>

          {categories.length ? (
            <div className="flex flex-wrap gap-2">
              {featuredCategories.map((category) => (
                <span
                  key={category}
                  className="inline-flex items-center gap-1 rounded-full border border-[color:var(--brand-2)/0.35] bg-[color:var(--brand-2)/0.12] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-[color:var(--brand-2)]"
                >
                  {category}
                </span>
              ))}
              {extraCategories > 0 && (
                <span className="inline-flex items-center rounded-full border border-border/60 bg-background/85 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
                  +{extraCategories} more
                </span>
              )}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-[color:var(--brand-1)/0.18] bg-background/84 px-5 py-6 text-left shadow-[0_25px_60px_-48px_rgba(7,58,104,0.85)] backdrop-blur"
              >
                <p className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
                  {stat.label}
                </p>
                <p className="mt-3 text-3xl font-semibold leading-tight text-[color:var(--brand-1)]">
                  {statFormatter.format(stat.value)}
                </p>
              </div>
            ))}
          </div>

          {highlightItem ? (
            <Link
              href={productPath(highlightItem.slug)}
              className="group relative flex flex-col gap-4 overflow-hidden rounded-3xl border border-[color:var(--brand-1)/0.2] bg-background/86 px-6 py-6 shadow-[0_30px_72px_-52px_rgba(7,58,104,0.9)] transition-all hover:border-[color:var(--brand-1)/0.4] hover:shadow-[0_36px_90px_-55px_rgba(7,58,104,0.95)]"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_120%_at_10%_0%,var(--brand-1)/0.18,transparent_70%),radial-gradient(110%_110%_at_100%_0%,var(--brand-3)/0.16,transparent_75%)] opacity-90"
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
                  Featured launch
                </span>
                <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </div>
              <div className="space-y-2">
                <p className="text-lg font-semibold text-foreground md:text-xl">
                  {highlightItem.name}
                </p>
                <p className="text-sm text-muted-foreground line-clamp-2 md:text-base">
                  {highlightItem.tagline}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--brand-1)/0.25] bg-background/70 px-2.5 py-0.5 text-[color:var(--brand-1)]">
                  {statFormatter.format(highlightItem.analytics?.upvotes ?? 0)}{" "}
                  upvotes
                </span>
                {highlightItem.verification?.isVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/60 bg-emerald-100/80 px-2.5 py-0.5 text-emerald-700">
                    Verified
                  </span>
                ) : null}
                {highlightItem.category?.name ? (
                  <span className="inline-flex items-center rounded-full border border-[color:var(--brand-2)/0.3] bg-background/75 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {highlightItem.category.name}
                  </span>
                ) : null}
                {highlightBadges.map((badge) => (
                  <span
                    key={badge}
                    className="inline-flex items-center rounded-full border border-[color:var(--brand-2)/0.35] bg-[color:var(--brand-2)/0.16] px-2.5 py-0.5 text-xs font-medium text-[color:var(--brand-2)]"
                  >
                    {badge}
                  </span>
                ))}
                {highlightBadgeOverflow > 0 && (
                  <span className="inline-flex items-center rounded-full border border-border/60 bg-background/80 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    +{highlightBadgeOverflow} more
                  </span>
                )}
              </div>
            </Link>
          ) : null}
        </div>
      </section>

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
