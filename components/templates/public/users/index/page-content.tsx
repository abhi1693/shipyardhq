import Link from "next/link"
import { Suspense } from "react"

import { getPublicUsersPage } from "@/actions/public/users/actions"
import {
  TrafficSidebarStats,
  TrafficSidebarStatsSkeleton,
} from "@/components/templates/public/common/TrafficSidebarStats"
import { TaxonomySponsorsSidebar } from "@/components/templates/public/common/TaxonomySponsorsSidebar"
import { getTaxonomySponsorProducts } from "@/components/templates/public/common/taxonomy-sponsors"
import MakersFeedClient from "@/components/templates/public/users/index/MakersFeedClient"
import { LEADERBOARD_PATH, MEMBER_PRODUCTS_ADD_PATH } from "@/lib/routes"

export async function UsersIndexPageContent() {
  const [usersPage, taxonomySponsors] = await Promise.all([
    getPublicUsersPage({ page: 1, pageSize: 18 }),
    getTaxonomySponsorProducts(),
  ])
  const initialPage = usersPage.nextPage ?? usersPage.page + 1
  const totalMakers = usersPage.total

  return (
    <main className="bg-[#f8f9ff] text-[#0b1c30]">
      <div className="mx-auto max-w-[1200px] px-4 py-8 md:px-6">
        <section className="relative overflow-hidden rounded-xl border border-[#e2e8f0] bg-white px-6 py-12 text-center shadow-sm md:px-12">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, #0051d5 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="relative z-10 mx-auto max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#0051d5]">
              Profile Directory
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-black md:text-5xl">
              Meet the people powering Shipyard
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#43474c] md:text-lg">
              Explore builders, follow their work, and see who is building
              momentum right now. The engine behind the next generation of
              digital products.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={MEMBER_PRODUCTS_ADD_PATH}
                className="inline-flex items-center justify-center rounded-lg bg-black px-8 py-3 text-base font-semibold text-white transition active:scale-95"
              >
                Submit your launch
              </Link>
              <Link
                href={LEADERBOARD_PATH}
                className="inline-flex items-center justify-center rounded-lg border border-[#e2e8f0] bg-white px-8 py-3 text-base font-semibold text-black transition hover:bg-[#f8fafc] active:scale-95"
              >
                View the leaderboard
              </Link>
            </div>
          </div>
        </section>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-black">
                  Active Makers
                </h2>
                <p className="mt-1 text-sm text-[#43474c]">
                  {totalMakers
                    ? `${totalMakers.toLocaleString()} makers with published launches.`
                    : "No makers to display yet."}
                </p>
              </div>
            </div>

            <section data-testid="makers-feed-section">
              <MakersFeedClient
                initialItems={usersPage.items}
                initialPage={initialPage}
                pageSize={usersPage.pageSize}
                initialHasMore={usersPage.hasMore}
              />
            </section>
          </div>

          <aside className="space-y-8 lg:col-span-4">
            <Suspense fallback={<TrafficSidebarStatsSkeleton />}>
              <TrafficSidebarStats />
            </Suspense>

            <TaxonomySponsorsSidebar products={taxonomySponsors} />
          </aside>
        </div>
      </div>
    </main>
  )
}
