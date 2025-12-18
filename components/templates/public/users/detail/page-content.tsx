import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { format } from "date-fns"

import CopyButton from "@/components/molecules/CopyButton"
import ShareProfileButton from "@/components/molecules/ShareProfileButton"
import AffiliateLinkCard from "@/components/molecules/AffiliateLinkCard"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/atoms/avatar"
import PublicTwoColumnLayout from "@/components/layout/public/PublicTwoColumnLayout"
import { StickyBanner } from "@/components/organisms/StickyBanner"
import {
  TrafficSidebarStats,
  TrafficSidebarStatsSkeleton,
} from "@/components/templates/public/common/TrafficSidebarStats"
import {
  SponsoredProductsSection,
  SponsoredProductsSkeleton,
} from "@/components/templates/public/homepage/sponsored-products"
import { UserFeedClient } from "@/components/templates/public/users/detail/UserFeedClient"
import {
  HERO_PRIMARY_BUTTON_CLASSES,
  HERO_SECONDARY_BUTTON_CLASSES,
} from "@/components/templates/public/categories/hero-button-classes"
import { LEADERBOARD_REWARDS_PATH, userPath } from "@/lib/routes"
import { getClerkUserByIdCached } from "@/lib/server/clerkUsers"
import { getUserProfilePayload } from "@/lib/users/page-cache"

interface PageProps {
  params: Promise<{ id: string }>
}

export async function UserProfilePageContent({ params }: PageProps) {
  const { id } = await params
  const payload = await getUserProfilePayload(id)

  if (!payload) return notFound()

  const {
    profile,
    leaderboardPosition,
    productsPage,
    totalProducts,
    totalUpvotes,
    totalVerifiedRevenueCents,
    totalVerifiedRevenueCurrency,
    rewardPoints,
    focusCategories,
    extraCategoryCount,
    badges,
    earliestLaunch,
  } = payload

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

  const profilePath = userPath(profile.id)

  const verifiedRevenueDisplay = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: totalVerifiedRevenueCurrency ?? "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format((totalVerifiedRevenueCents ?? 0) / 100)

  const stats: Array<{ label: string; value?: number; display?: string }> = [
    { label: "Published launches", value: totalProducts },
    { label: "Community upvotes", value: totalUpvotes },
    { label: "Verified revenue", display: verifiedRevenueDisplay },
    { label: "Reward points", value: rewardPoints },
  ]
  const statFormatter = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  })

  const summaryParts: string[] = []
  const earliestLaunchDate = earliestLaunch ? new Date(earliestLaunch) : null

  if (earliestLaunchDate) {
    summaryParts.push(
      `Building on Shipyard since ${format(earliestLaunchDate, "MMMM yyyy")}.`,
    )
  }
  if (focusCategories.length) {
    summaryParts.push(
      `Focus areas: ${focusCategories.join(", ")}${
        extraCategoryCount ? ` (+${extraCategoryCount} more)` : ""
      }.`,
    )
  }
  const totalBadgeCount = badges.showcase.length + badges.overflow
  if (totalBadgeCount) {
    summaryParts.push(
      `Earned ${totalBadgeCount} badge${totalBadgeCount === 1 ? "" : "s"} across launches.`,
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

  const initialFeedPage = productsPage.nextPage ?? productsPage.page + 1

  return (
    <main className="relative isolate bg-[#f5f7fb]">
      <PublicTwoColumnLayout
        className="pb-24 pt-12"
        mainClassName="gap-10"
        main={
          <>
            <section className="rounded-3xl border border-border/40 bg-white px-6 py-12 text-center shadow-[0_32px_96px_-60px_rgba(7,58,104,0.35)] sm:px-10">
              <div className="mx-auto flex max-w-4xl flex-col items-center gap-6">
                <Avatar className="h-20 w-20 rounded-[1.5rem] bg-muted shadow-sm">
                  {avatarUrl ? (
                    <AvatarImage
                      src={avatarUrl}
                      alt={fullName}
                      width={80}
                      height={80}
                      className="object-cover"
                    />
                  ) : null}
                  <AvatarFallback className="flex h-full w-full items-center justify-center rounded-[inherit] bg-muted text-3xl font-semibold text-muted-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="space-y-4">
                  <h1 className="text-4xl font-semibold leading-tight text-[color:var(--brand-1)] sm:text-5xl">
                    {fullName}
                  </h1>
                  <p className="mx-auto max-w-2xl text-base text-muted-foreground">
                    {profileSummary}
                  </p>
                  <Link
                    href={LEADERBOARD_REWARDS_PATH}
                    className="inline-flex items-center justify-center gap-1 text-sm font-semibold text-[color:var(--brand-1)] hover:underline"
                    title={leaderboardTitle}
                  >
                    {leaderboardPosition
                      ? `Ranked #${leaderboardPosition.rank.toLocaleString(
                          "en-US",
                        )} on the User Leaderboard`
                      : "View the User Leaderboard"}
                  </Link>
                </div>

                <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
                  <ShareProfileButton
                    path={profilePath}
                    fullName={fullName}
                    productCount={totalProducts}
                    className={HERO_PRIMARY_BUTTON_CLASSES}
                  />
                  <CopyButton
                    text={profilePath}
                    resolveAbsolute
                    size="sm"
                    variant="outline"
                    className={HERO_SECONDARY_BUTTON_CLASSES}
                  >
                    Copy profile link
                  </CopyButton>
                </div>

                <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-border/70 bg-background/90 px-5 py-6 text-left shadow-sm shadow-black/5"
                    >
                      <p className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
                        {stat.label}
                      </p>
                      <p className="mt-3 text-3xl font-semibold leading-tight text-foreground">
                        {stat.display ?? statFormatter.format(stat.value ?? 0)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <StickyBanner className="mx-auto w-full rounded-2xl" />

            <section className="space-y-6" data-testid="user-feed-section">
              <UserFeedClient
                userId={profile.id}
                initialItems={productsPage.items}
                initialPage={initialFeedPage}
                pageSize={productsPage.pageSize}
                initialHasMore={productsPage.hasMore}
              />
            </section>
          </>
        }
        sidebar={
          <div className="flex flex-col gap-8">
            <Suspense fallback={<TrafficSidebarStatsSkeleton />}>
              <TrafficSidebarStats />
            </Suspense>
            <Suspense fallback={<SponsoredProductsSkeleton />}>
              <SponsoredProductsSection />
            </Suspense>
            <AffiliateLinkCard />
          </div>
        }
      />
    </main>
  )
}
