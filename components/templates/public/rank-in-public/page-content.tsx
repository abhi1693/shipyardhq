import { auth } from "@clerk/nextjs/server"

import { getVersusMatchup } from "@/actions/public/products/versus"
import { getTopRankedProducts } from "@/actions/public/leaderboard/actions"
import { VersusArena } from "@/components/pages/VersusArena"
import { DirectorySectionHeader } from "@/components/molecules/directory/SectionHeader"
import { DirectoryProductList } from "@/components/organisms/directory/DirectoryProductList"

type LeaderboardProduct = Awaited<
  ReturnType<typeof getTopRankedProducts>
>[number]

export async function RankInPublicPageContent() {
  const authResult = await auth()

  const leaderboardLimit = 8

  const [initialMatchup, leaderboard] = await Promise.all([
    getVersusMatchup({ clerkUserId: authResult?.userId }),
    getTopRankedProducts({ limit: leaderboardLimit }),
  ])

  return (
    <main className="relative isolate bg-white">
      <div className="relative mx-auto w-full max-w-[120rem] px-4 pb-24 pt-12 md:px-8">
        <div className="space-y-12">
          <VersusArena initialMatchup={initialMatchup} />

          <section className="rounded-3xl border border-border/70 bg-white/90 p-6 shadow-sm shadow-black/5 md:p-10">
            <DirectorySectionHeader
              kicker="Top of the board"
              title="Current Shipyard front-runners"
              description="Upvotes fuel every rank. See who is ahead before you spin a new matchup."
            />
            <div className="mt-8">
              <DirectoryProductList
                items={leaderboard.map((product: LeaderboardProduct) => {
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
