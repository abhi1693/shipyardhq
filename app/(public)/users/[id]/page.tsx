import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { format } from "date-fns"

import {
  getPublicUserMeta,
  getPublicUserProfile,
} from "@/actions/public/users/actions"
import { getRewardsLeaderboardPositionForUser } from "@/actions/public/rewards/actions"
import CopyButton from "@/components/molecules/CopyButton"
import ShareProfileButton from "@/components/molecules/ShareProfileButton"
import { EmptyState } from "@/components/molecules/empty-state"
import { DirectorySectionHeader } from "@/components/molecules/directory/SectionHeader"
import { DirectoryProductList } from "@/components/organisms/directory/DirectoryProductList"
import { DirectoryPromoCard } from "@/components/organisms/directory/PromoCard"
import { Badge } from "@/components/atoms/badge"
import { Rocket } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/atoms/avatar"
import { buildPageMetadata } from "@/lib/metadata"
import {
  BROWSE_PATH,
  HOME_PATH,
  LEADERBOARD_PATH,
  LEADERBOARD_REWARDS_PATH,
  MEMBER_PRODUCTS_PATH,
  USERS_PATH,
  productPath,
  userPath,
} from "@/lib/routes"
import { getClerkUserByIdCached } from "@/lib/server/clerkUsers"

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

export default async function MakerProfilePage({ params }: PageProps) {
  const { id } = await params
  const profile = await getPublicUserProfile(id)

  if (!profile) return notFound()

  const leaderboardPosition = await getRewardsLeaderboardPositionForUser(
    profile.id,
  )

  const leaderboardTitle =
    leaderboardPosition && leaderboardPosition.totalEligible > 0
      ? `Ranked #${leaderboardPosition.rank.toLocaleString(
          "en-US",
        )} of ${leaderboardPosition.totalEligible.toLocaleString(
          "en-US",
        )} eligible makers on the User Leaderboard`
      : undefined

  const fullName =
    `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() ||
    "Shipyard maker"

  let avatarUrl: string | null = null
  if (profile.clerkId) {
    try {
      const clerkUser = await getClerkUserByIdCached(profile.clerkId)
      avatarUrl = clerkUser.imageUrl ?? null
    } catch {
      avatarUrl = null
    }
  }

  const now = new Date()
  let totalUpvotes = 0
  let verifiedCount = 0

  const categoryCounts = new Map<string, number>()
  const badgeSet = new Set<string>()

  const products = profile.products ?? []

  const items = products.map((product: PublicUserProduct) => {
    const upvotes = product.analytics?.upvotes ?? 0
    totalUpvotes += upvotes

    if (product.verification?.isVerified) {
      verifiedCount += 1
    }

    const categoryName = product.category?.name
    if (categoryName) {
      categoryCounts.set(
        categoryName,
        (categoryCounts.get(categoryName) ?? 0) + 1,
      )
    }

    const activeBadges = (product.ProductBadge ?? [])
      .filter((badge) => !badge.expiresAt || new Date(badge.expiresAt) > now)
      .map((badge) => {
        badgeSet.add(badge.badge)
        return badge.badge
      })

    const launchedAtRaw = product.publishedAt ?? product.createdAt ?? null
    const launchedAt = launchedAtRaw ? new Date(launchedAtRaw) : null
    const metaLabel = launchedAt ? format(launchedAt, "MMM d, yyyy") : undefined

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      logo: product.logo,
      tagline: product.tagline,
      analytics: product.analytics ?? null,
      category: product.category ? { name: product.category.name } : undefined,
      verification: product.verification ?? undefined,
      badges: activeBadges,
      metaLabel,
      launchedAt,
    }
  })

  const totalProducts = items.length
  const categoryEntries = Array.from(categoryCounts.entries()).sort(
    (a, b) => b[1] - a[1],
  )
  const focusCategories = categoryEntries.slice(0, 4).map(([name]) => name)
  const extraCategoryCount = Math.max(
    categoryEntries.length - focusCategories.length,
    0,
  )
  const uniqueBadges = Array.from(badgeSet)
  const badgeShowcase = uniqueBadges.slice(0, 6)
  const badgeOverflow = Math.max(uniqueBadges.length - badgeShowcase.length, 0)

  const sortedByDate = [...items].sort((a, b) => {
    const aTime = a.launchedAt ? a.launchedAt.getTime() : 0
    const bTime = b.launchedAt ? b.launchedAt.getTime() : 0
    return bTime - aTime
  })
  const recentLaunches = sortedByDate.slice(0, 5)

  const earliestLaunch =
    sortedByDate[sortedByDate.length - 1]?.launchedAt ?? null

  const stats = [
    { label: "Published launches", value: totalProducts },
    { label: "Community upvotes", value: totalUpvotes },
    { label: "Verified wins", value: verifiedCount },
    { label: "Focus areas", value: categoryEntries.length },
  ]
  const statFormatter = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  })

  const summaryParts: string[] = []
  if (earliestLaunch) {
    summaryParts.push(
      `Building on Shipyard since ${format(earliestLaunch, "MMMM yyyy")}.`,
    )
  }
  if (focusCategories.length) {
    summaryParts.push(
      `Focus areas: ${focusCategories.join(", ")}${
        extraCategoryCount ? ` (+${extraCategoryCount} more)` : ""
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
        ? `${fullName} is actively shipping products with the Shipyard community.`
        : "This maker hasn’t published any products yet. Check back soon for their first launch.",
    )
  }
  const profileSummary = summaryParts.join(" ")

  const initials =
    fullName
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2) || "SY"

  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ).replace(/\/$/, "")
  const profilePath = userPath(profile.id)
  const profileUrl = `${baseUrl}${profilePath}`

  const ldPerson = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: fullName,
    url: profileUrl,
    identifier: profile.id,
  }
  const ldItemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: `${baseUrl}${productPath(item.slug)}`,
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
        item: `${baseUrl}${HOME_PATH}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Makers",
        item: `${baseUrl}${USERS_PATH}`,
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
    <main className="relative isolate bg-white">
      <div className="relative mx-auto w-full max-w-[120rem] px-4 pb-24 pt-14 md:px-8">
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
        {items.length > 0 ? (
          <script
            type="application/ld+json"
            suppressHydrationWarning
            dangerouslySetInnerHTML={{ __html: JSON.stringify(ldItemList) }}
          />
        ) : null}

        <div className="grid gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,1.1fr)]">
          <div className="flex flex-col gap-10">
            <section className="relative overflow-hidden rounded-3xl border border-border bg-white p-6 shadow-sm md:p-10">
              <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-start gap-5 md:items-center">
                    <Avatar className="h-16 w-16 shrink-0 rounded-3xl bg-muted shadow-sm md:h-20 md:w-20">
                      {avatarUrl ? (
                        <AvatarImage
                          src={avatarUrl}
                          alt={fullName}
                          className="object-cover"
                        />
                      ) : null}
                      <AvatarFallback className="flex h-full w-full items-center justify-center rounded-[inherit] bg-muted text-2xl font-semibold text-muted-foreground md:text-3xl">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-3 md:pt-1">
                      <h1 className="bg-[linear-gradient(95deg,var(--brand-1),var(--brand-2),var(--brand-3))] bg-clip-text text-3xl font-semibold leading-tight text-transparent sm:text-4xl md:text-5xl">
                        {fullName}
                      </h1>
                      <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
                        {profileSummary}
                      </p>
                      <Link
                        href={LEADERBOARD_REWARDS_PATH}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--brand-1)] hover:underline"
                        title={leaderboardTitle}
                      >
                        {leaderboardPosition
                          ? `Ranked #${leaderboardPosition.rank.toLocaleString(
                              "en-US",
                            )} on the User Leaderboard`
                          : "View the User Leaderboard"}
                      </Link>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <CopyButton
                      text={profilePath}
                      resolveAbsolute
                      size="sm"
                      variant="outline"
                      className="border-border bg-white text-muted-foreground"
                    >
                      Copy profile link
                    </CopyButton>
                    <ShareProfileButton
                      path={profilePath}
                      fullName={fullName}
                      productCount={totalProducts}
                      className="border-border bg-white text-muted-foreground"
                    />
                  </div>
                </div>

                {focusCategories.length ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {focusCategories.map((category) => (
                      <Badge
                        key={category}
                        variant="outline"
                        className="rounded-full border-border bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.26em] text-muted-foreground"
                      >
                        {category}
                      </Badge>
                    ))}
                    {extraCategoryCount > 0 ? (
                      <Badge
                        variant="outline"
                        className="rounded-full border-border bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.26em] text-muted-foreground"
                      >
                        +{extraCategoryCount} more
                      </Badge>
                    ) : null}
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-border bg-white px-5 py-6 shadow-sm"
                    >
                      <p className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
                        {stat.label}
                      </p>
                      <p className="mt-3 text-3xl font-semibold leading-tight text-foreground">
                        {statFormatter.format(stat.value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-border/80 bg-background/88 p-6 shadow-sm shadow-black/5 md:p-8">
              <DirectorySectionHeader
                kicker="Launch roster"
                title="Published products"
                description={
                  totalProducts
                    ? `Showing ${totalProducts.toLocaleString()} launch${
                        totalProducts === 1 ? "" : "es"
                      } from ${fullName}.`
                    : `${fullName} hasn’t published any launches yet.`
                }
              />

              {totalProducts ? (
                <div className="mt-8">
                  <DirectoryProductList
                    items={items}
                    columns="grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                    showBadges
                    metaConfig={{
                      type: "badge",
                      badgeClassName:
                        "border-border/60 bg-muted/60 text-muted-foreground",
                    }}
                  />
                </div>
              ) : (
                <div className="mt-10">
                  <EmptyState
                    title="No published products"
                    description="This maker hasn’t shipped a product yet. Check back soon."
                  />
                </div>
              )}
            </section>
          </div>

          <aside className="flex flex-col gap-8">
            <section className="rounded-3xl border border-border/70 bg-background/90 p-6 shadow-sm shadow-black/5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Launch cadence
              </h2>
              {recentLaunches.length ? (
                <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                  {recentLaunches.map((launch) => (
                    <li key={launch.id} className="flex justify-between gap-3">
                      <Link
                        href={productPath(launch.slug)}
                        className="truncate font-medium text-foreground hover:text-foreground"
                      >
                        {launch.name}
                      </Link>
                      <span className="shrink-0 text-xs uppercase tracking-[0.28em] text-muted-foreground">
                        {launch.launchedAt
                          ? format(launch.launchedAt, "MMM d, yyyy")
                          : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  No launches yet — follow this maker to see their first drop.
                </p>
              )}
            </section>

            <section className="rounded-3xl border border-border/70 bg-background/90 p-6 shadow-sm shadow-black/5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Focus categories
              </h2>
              {categoryEntries.length ? (
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {categoryEntries.map(([name, count]) => (
                    <li key={name} className="flex justify-between gap-3">
                      <span className="text-foreground">{name}</span>
                      <span className="text-xs uppercase tracking-[0.28em]">
                        {count}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  No categories recorded yet.
                </p>
              )}
            </section>

            <section className="rounded-3xl border border-border/70 bg-background/90 p-6 shadow-sm shadow-black/5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Badges earned
              </h2>
              {badgeShowcase.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {badgeShowcase.map((badge) => (
                    <Badge
                      key={badge}
                      variant="outline"
                      className="rounded-full border-border bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground"
                    >
                      {badge}
                    </Badge>
                  ))}
                  {badgeOverflow > 0 ? (
                    <Badge
                      variant="outline"
                      className="rounded-full border-border/60 bg-background/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground"
                    >
                      +{badgeOverflow} more
                    </Badge>
                  ) : null}
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  No badges unlocked yet.
                </p>
              )}
            </section>

            <DirectoryPromoCard
              eyebrow="Launch with Shipyard"
              title="Ready to publish your own product?"
              description="Join Shipyard to unlock homepage features, leaderboard visibility, and analytics that help your next launch go further."
              cta={{
                label: "Submit your launch",
                href: MEMBER_PRODUCTS_PATH,
                icon: <Rocket className="h-4 w-4" aria-hidden="true" />,
              }}
              subtleCta={{
                label: "Browse the product directory",
                href: BROWSE_PATH,
              }}
            />

            <DirectoryPromoCard
              eyebrow="Track the momentum"
              title="Watch makers climb the leaderboard"
              description="Head back to the live leaderboard to see which launches are earning upvotes right now across every category."
              cta={{
                label: "View the leaderboard",
                href: LEADERBOARD_PATH,
                variant: "ghost",
              }}
            />
          </aside>
        </div>
      </div>
    </main>
  )
}
