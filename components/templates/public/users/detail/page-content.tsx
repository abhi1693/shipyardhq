import { notFound } from "next/navigation"
import { format } from "date-fns"
import { Award, BadgeCheck, BarChart3, Star } from "lucide-react"

import { Image } from "@/components/atoms/image"
import { PartnerSpotlightStaticPlacement } from "@/components/organisms/PartnerSpotlightStaticPlacement"
import { UserFeedClient } from "@/components/templates/public/users/detail/UserFeedClient"
import {
  EmptyUserProductFeed,
  UserProductGrid,
} from "@/components/templates/public/users/detail/UserProductFeed"
import { isOptimizedImageSrc } from "@/lib/images/sources"
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
    productsPage,
    totalProducts,
    totalUpvotes,
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
      avatarUrl = isOptimizedImageSrc(clerkUser.imageUrl)
        ? clerkUser.imageUrl
        : null
    } catch {
      avatarUrl = null
    }
  }

  const earliestLaunchDate = earliestLaunch ? new Date(earliestLaunch) : null
  const memberSince = earliestLaunchDate
    ? format(earliestLaunchDate, "MMMM yyyy")
    : "recently"
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

  return (
    <main className="bg-[#f8f9ff] text-[#0b1c30]">
      <div className="mx-auto max-w-[1200px] px-4 py-6 md:px-6">
        <section className="mb-6 rounded-lg border border-[#e2e8f0] bg-white/80 p-6 shadow-sm backdrop-blur md:p-8">
          <div className="flex flex-col items-center gap-8 md:flex-row md:items-start">
            <div className="relative shrink-0">
              <div className="relative h-32 w-32 overflow-hidden rounded-lg border-4 border-white bg-[#e5eeff] shadow-xl md:h-40 md:w-40">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={fullName}
                    fill
                    sizes="(min-width: 768px) 160px, 128px"
                    className="object-cover"
                    loading="eager"
                    fetchPriority="high"
                    placeholder="empty"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-4xl font-semibold text-[#38485f]">
                    {initials}
                  </span>
                )}
              </div>
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
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#ffedd5] px-3 py-1 text-xs font-semibold text-[#9a3412]">
                    <Star className="h-3.5 w-3.5" aria-hidden />
                    {badgeCount ? "Top Maker" : "Maker"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#0051d5]/10 px-3 py-1 text-xs font-semibold text-[#0051d5]">
                    <Award className="h-3.5 w-3.5" aria-hidden />
                    {badgeCount.toLocaleString("en-US")} active badge
                    {badgeCount === 1 ? "" : "s"}
                  </span>
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
                ["Total upvotes", totalUpvotes],
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
              {productsPage.items.length ? (
                <>
                  <UserProductGrid items={productsPage.items} />
                  {productsPage.hasMore ? (
                    <UserFeedClient
                      userId={profile.id}
                      initialItems={[]}
                      initialPage={initialFeedPage}
                      pageSize={productsPage.pageSize}
                      referenceDateIso={referenceDateIso}
                      initialHasMore={productsPage.hasMore}
                    />
                  ) : null}
                </>
              ) : (
                <EmptyUserProductFeed />
              )}
            </section>

            <PartnerSpotlightStaticPlacement className="mx-auto w-full rounded-lg" />
          </div>

          <aside className="flex flex-col gap-6 lg:col-span-4">
            <section className="rounded-lg border border-[#e2e8f0] bg-white p-6">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#43474c]">
                Founder pulse
              </h3>
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm text-[#43474c]">
                    <BarChart3 className="h-4 w-4 text-[#0051d5]" />
                    Launch activity
                  </span>
                  <span className="text-sm font-semibold text-black">
                    {formatStat(totalProducts)}
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
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  )
}
