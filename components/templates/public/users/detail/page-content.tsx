import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import {
  Award,
  BadgeCheck,
  BarChart3,
  ExternalLink,
  Megaphone,
  Rocket,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/atoms/avatar"
import { StickyBanner } from "@/components/organisms/StickyBanner"
import { UserFeedClient } from "@/components/templates/public/users/detail/UserFeedClient"
import {
  BROWSE_PATH,
  LEADERBOARD_REWARDS_PATH,
  PRICING_PATH,
  productPath,
} from "@/lib/routes"
import { getClerkUserByIdCached } from "@/lib/server/clerkUsers"
import { getUserProfilePayload } from "@/lib/users/page-cache"

interface PageProps {
  params: Promise<{ id: string }>
}

const statFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
})

function formatStat(value: number) {
  return statFormatter.format(value)
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
    rewardPoints,
    focusCategories,
    extraCategoryCount,
    badges,
    earliestLaunch,
    verifiedCount,
  } = payload
  const referenceDateIso = new Date().toISOString()

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

  const earliestLaunchDate = earliestLaunch ? new Date(earliestLaunch) : null
  const memberSince = earliestLaunchDate
    ? format(earliestLaunchDate, "MMMM yyyy")
    : "recently"
  const primaryProduct = productsPage.items[0] ?? null
  const categoryLine = focusCategories.length
    ? `${focusCategories.join(", ")}${
        extraCategoryCount ? ` (+${extraCategoryCount} more)` : ""
      }`
    : "Product discovery"

  const summary = totalProducts
    ? `Building on Shipyard since ${memberSince}. Focus areas: ${categoryLine}. Shipping practical tools for operators, makers, and high-intent buyers.`
    : `Building on Shipyard since ${memberSince}. This maker has not published a launch yet, but their profile is ready for the next product drop.`

  const initials =
    fullName
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2) || "SY"

  const initialFeedPage = productsPage.nextPage ?? productsPage.page + 1
  const badgeCount = badges.showcase.length + badges.overflow
  const rankLabel = leaderboardPosition
    ? `Rank #${leaderboardPosition.rank.toLocaleString("en-US")}`
    : "Leaderboard ready"

  return (
    <main className="bg-[#f8f9ff] text-[#0b1c30]">
      <div className="mx-auto max-w-[1200px] px-4 py-6 md:px-6">
        <section className="mb-6 rounded-lg border border-[#e2e8f0] bg-white/80 p-6 shadow-sm backdrop-blur md:p-8">
          <div className="flex flex-col items-center gap-8 md:flex-row md:items-start">
            <div className="relative shrink-0">
              <Avatar className="h-32 w-32 rounded-lg border-4 border-white bg-[#e5eeff] shadow-xl md:h-40 md:w-40">
                {avatarUrl ? (
                  <AvatarImage
                    src={avatarUrl}
                    alt={fullName}
                    width={160}
                    height={160}
                    className="object-cover"
                  />
                ) : null}
                <AvatarFallback className="rounded-[inherit] bg-[#e5eeff] text-4xl font-semibold text-[#4c6077]">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-2 -right-2 rounded-full border-2 border-white bg-[#16a34a] p-2 text-white shadow-lg">
                <BadgeCheck className="h-4 w-4" aria-hidden />
              </div>
            </div>

            <div className="min-w-0 flex-1 text-center md:text-left">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <h1 className="text-3xl font-bold tracking-tight text-black md:text-4xl">
                  {fullName}
                </h1>
                <div className="flex flex-wrap justify-center gap-2 md:justify-start">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#f97316]/10 px-3 py-1 text-xs font-semibold text-[#f97316]">
                    <Star className="h-3.5 w-3.5" aria-hidden />
                    {badgeCount ? "Top Maker" : "Maker"}
                  </span>
                  <Link
                    href={LEADERBOARD_REWARDS_PATH}
                    className="inline-flex items-center gap-1 rounded-full bg-[#0051d5]/10 px-3 py-1 text-xs font-semibold text-[#0051d5] transition hover:bg-[#0051d5]/15"
                  >
                    <Award className="h-3.5 w-3.5" aria-hidden />
                    {rankLabel}
                  </Link>
                </div>
              </div>

              <p className="mt-4 max-w-3xl text-base leading-7 text-[#43474c]">
                {summary}
              </p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-8">
            <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ["Published products", totalProducts],
                ["Community upvotes", totalUpvotes],
                ["Reward balance", rewardPoints],
                ["Verified launches", verifiedCount],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="rounded-lg border border-[#e2e8f0] bg-white p-5"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#43474c]">
                    {label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-black">
                    {formatStat(Number(value))}
                  </p>
                </div>
              ))}
            </section>

            <section data-testid="user-feed-section">
              <div className="mb-3 flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-black">
                  Published Products
                </h2>
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#43474c]">
                  {totalProducts.toLocaleString("en-US")} project
                  {totalProducts === 1 ? "" : "s"} total
                </span>
              </div>
              <div aria-hidden className="h-32 md:hidden" />
              <UserFeedClient
                userId={profile.id}
                initialItems={productsPage.items}
                initialPage={initialFeedPage}
                pageSize={productsPage.pageSize}
                referenceDateIso={referenceDateIso}
                initialHasMore={productsPage.hasMore}
              />
            </section>

            <StickyBanner className="mx-auto w-full rounded-lg" />

            <section className="relative overflow-hidden rounded-lg border border-[#e2e8f0] bg-[#eff4ff] p-6">
              <span className="absolute right-0 top-0 rounded-bl-lg border-b border-l border-[#e2e8f0] bg-white px-3 py-1 text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#43474c]">
                Sponsored
              </span>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-black text-white">
                  <TrendingUp className="h-6 w-6" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold text-black">GitRank</h3>
                  <p className="text-sm leading-6 text-[#43474c]">
                    Turn Git activity into competitive rankings and momentum
                    scores for your team.
                  </p>
                </div>
                <Link
                  href={PRICING_PATH}
                  className="inline-flex items-center justify-center rounded-lg border border-[#e2e8f0] bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#f8f9ff]"
                >
                  Try Now
                </Link>
              </div>
            </section>
          </div>

          <aside className="flex flex-col gap-6 lg:col-span-4">
            <section className="rounded-lg border border-dashed border-[#e2e8f0] bg-[#f8fafc] p-6">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#f97316]" aria-hidden />
                <h3 className="text-lg font-semibold text-black">Sponsors</h3>
              </div>
              <div className="space-y-4">
                <Link
                  href={
                    primaryProduct
                      ? productPath(primaryProduct.slug)
                      : BROWSE_PATH
                  }
                  className="flex items-center gap-3 rounded-lg border border-[#e2e8f0] bg-white p-3 transition hover:scale-[1.01]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-black text-white">
                    <Rocket className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-black">
                      {primaryProduct?.name ?? "Featured launch"}
                    </p>
                    <p className="truncate text-[11px] text-[#43474c]">
                      {primaryProduct?.tagline ?? "Discover maker tools."}
                    </p>
                  </div>
                </Link>
                <Link
                  href={PRICING_PATH}
                  className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#c4c6cd] p-5 text-center transition hover:bg-white"
                >
                  <Megaphone className="mb-2 h-8 w-8 text-[#74777d]" />
                  <p className="text-sm font-semibold text-[#43474c]">
                    Your product here?
                  </p>
                  <p className="text-[11px] text-[#74777d]">
                    Reach makers browsing founder profiles
                  </p>
                </Link>
              </div>
            </section>

            <section className="rounded-lg border border-[#e2e8f0] bg-white p-6">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#43474c]">
                Founder pulse
              </h3>
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm text-[#43474c]">
                    <BarChart3 className="h-4 w-4 text-[#0051d5]" />
                    Upvotes per launch
                  </span>
                  <span className="text-sm font-semibold text-black">
                    {formatStat(
                      totalProducts
                        ? Math.round(totalUpvotes / totalProducts)
                        : 0,
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm text-[#43474c]">
                    <Award className="h-4 w-4 text-[#f97316]" />
                    Active badges
                  </span>
                  <span className="text-sm font-semibold text-black">
                    {badgeCount.toLocaleString("en-US")}
                  </span>
                </div>
                <Link
                  href={LEADERBOARD_REWARDS_PATH}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-[#0051d5] hover:underline"
                >
                  View leaderboard
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  )
}
