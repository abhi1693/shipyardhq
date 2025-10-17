import { auth } from "@clerk/nextjs/server"

import { getVersusMatchup } from "@/actions/public/products/versus"
import {
  getTopRankedProducts,
  getLeaderboardStats,
} from "@/actions/public/leaderboard/actions"
import { VersusArena } from "@/components/pages/VersusArena"
import { DirectorySectionHeader } from "@/components/molecules/directory/SectionHeader"
import { DirectoryProductList } from "@/components/organisms/directory/DirectoryProductList"
import DirectoryHeader from "@/components/organisms/directory/DirectoryHeader"
import { buildPageMetadata } from "@/lib/metadata"
import { MEMBER_PRODUCTS_PATH, BROWSE_PATH } from "@/lib/routes"

export const dynamic = "force-dynamic"

export const metadata = buildPageMetadata({
  title: "Shipyard VS Arena — Head-to-head launch battles",
  description:
    "Jump into Shipyard's VS arena to upvote competing launches in real time and help rank the community's top products.",
})

type LeaderboardProduct = Awaited<
  ReturnType<typeof getTopRankedProducts>
>[number]

export default async function VersusPage() {
  const authResult = await auth()

  const [initialMatchup, leaderboard, stats] = await Promise.all([
    getVersusMatchup({ clerkUserId: authResult?.userId }),
    getTopRankedProducts({ limit: 12 }),
    getLeaderboardStats(),
  ])

  const topEight = leaderboard.slice(0, 8)

  return (
    <main className="relative isolate bg-white">
      <div className="relative mx-auto w-full max-w-[120rem] px-4 pb-24 pt-12 md:px-8">
        <div className="space-y-12">
          <div className="space-y-5">
            <DirectoryHeader
              stats={stats}
              eyebrow="Gamified rankings"
              title="Shipyard VS Arena"
              description="Help Shipyard surface breakout tools by voting in live head-to-head battles. Every upvote becomes a rank point pushing launches up the board."
              primaryAction={{
                label: "Submit your launch",
                href: MEMBER_PRODUCTS_PATH,
              }}
              secondaryAction={{
                label: "Browse launches",
                href: BROWSE_PATH,
                variant: "outline",
              }}
            />

          </div>

          <VersusArena initialMatchup={initialMatchup} />

          <section className="rounded-3xl border border-border/70 bg-white/90 p-6 shadow-sm shadow-black/5 md:p-10">
            <DirectorySectionHeader
              kicker="Top of the board"
              title="Current Shipyard front-runners"
              description="Upvotes fuel every rank. See who is ahead before you spin a new matchup."
            />
            <div className="mt-8">
              <DirectoryProductList
                items={topEight.map((product: LeaderboardProduct) => {
                  const activeBadges = (product.ProductBadge ?? []).filter(
                    (badge) =>
                      !badge.expiresAt ||
                      new Date(badge.expiresAt).getTime() > Date.now(),
                  )

                  return {
                    id: product.id,
                    slug: product.slug,
                    name: product.name,
                    logo: product.logo,
                    tagline: product.tagline,
                    analytics: product.analytics ?? null,
                    category: product.category ?? undefined,
                    badges: activeBadges.map((badge) => badge.badge),
                    metaLabel: product.analytics?.upvotes
                      ? `${product.analytics.upvotes.toLocaleString()} upvotes`
                      : undefined,
                  }
                })}
                columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                metaConfig={{
                  type: "rank",
                  badgeClassName:
                    "border-[color:var(--brand-1)/0.28] bg-[color:var(--brand-1)/0.12] text-[color:var(--brand-1)]",
                }}
                showBadges
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
