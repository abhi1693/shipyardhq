import Link from "next/link"
import { Suspense } from "react"

import { getPublicUsersPage } from "@/actions/public/users/actions"
import PublicTwoColumnLayout from "@/components/layout/public/PublicTwoColumnLayout"
import { StickyBanner } from "@/components/organisms/StickyBanner"
import AffiliateLinkCard from "@/components/molecules/AffiliateLinkCard"
import {
  DirectoryHighlightsSidebar,
  DirectoryHighlightsSidebarSkeleton,
} from "@/components/templates/public/homepage/directory-highlights"
import {
  TrafficSidebarStats,
  TrafficSidebarStatsSkeleton,
} from "@/components/templates/public/common/TrafficSidebarStats"
import {
  SponsoredProductsSection,
  SponsoredProductsSkeleton,
} from "@/components/templates/public/homepage/sponsored-products"
import {
  HERO_PRIMARY_BUTTON_CLASSES,
  HERO_SECONDARY_BUTTON_CLASSES,
} from "@/components/templates/public/categories/hero-button-classes"
import MakersFeedClient from "@/components/templates/public/users/index/MakersFeedClient"
import { LEADERBOARD_REWARDS_PATH, MEMBER_PRODUCTS_PATH } from "@/lib/routes"

export async function UsersIndexPageContent() {
  const usersPage = await getPublicUsersPage({ page: 1, pageSize: 24 })
  const initialPage = usersPage.nextPage ?? usersPage.page + 1
  const totalMakers = usersPage.total

  return (
    <main className="relative isolate bg-[#f5f7fb]">
      <PublicTwoColumnLayout
        className="pb-24 pt-12"
        mainClassName="gap-10"
        main={
          <>
            <section className="rounded-3xl border border-border/40 bg-white px-6 py-12 text-center shadow-[0_32px_96px_-60px_rgba(7,58,104,0.35)] sm:px-10">
              <div className="mx-auto flex max-w-3xl flex-col items-center gap-6">
                <div className="space-y-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.36em] text-muted-foreground">
                    Profile directory
                  </p>
                  <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                    Meet the people powering Shipyard
                  </h1>
                  <p className="text-base text-muted-foreground">
                    Explore Shipyard makers, follow their work, and see who is
                    building momentum right now.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
                  <Link
                    href={MEMBER_PRODUCTS_PATH}
                    className={HERO_PRIMARY_BUTTON_CLASSES}
                  >
                    Submit your launch
                  </Link>
                  <Link
                    href={LEADERBOARD_REWARDS_PATH}
                    className={HERO_SECONDARY_BUTTON_CLASSES}
                  >
                    View the leaderboard
                  </Link>
                </div>
              </div>
            </section>

            <StickyBanner className="mx-auto w-full rounded-2xl" />

            <section className="space-y-3" data-testid="makers-feed-section">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {totalMakers
                    ? `Showing ${Math.min(usersPage.items.length, totalMakers).toLocaleString()} of ${totalMakers.toLocaleString()} makers with published launches.`
                    : "No makers to display yet."}
                </span>
                <Link
                  href={LEADERBOARD_REWARDS_PATH}
                  className="text-[color:var(--brand-1)] hover:underline"
                >
                  View leaderboard
                </Link>
              </div>
              <MakersFeedClient
                initialItems={usersPage.items}
                initialPage={initialPage}
                pageSize={usersPage.pageSize}
                initialHasMore={usersPage.hasMore}
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
            <Suspense fallback={<DirectoryHighlightsSidebarSkeleton />}>
              <DirectoryHighlightsSidebar />
            </Suspense>
            <AffiliateLinkCard />
          </div>
        }
      />
    </main>
  )
}
