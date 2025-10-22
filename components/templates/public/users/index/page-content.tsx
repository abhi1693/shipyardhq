import Link from "next/link"

import { getPublicUsersWithCounts } from "@/actions/public/users/actions"
import { getLeaderboardStats } from "@/actions/public/leaderboard/actions"
import DirectoryHeader from "@/components/organisms/directory/DirectoryHeader"
import { DirectorySectionHeader } from "@/components/molecules/directory/SectionHeader"
import { DirectoryPromoCard } from "@/components/organisms/directory/PromoCard"
import { MakerCard } from "@/components/molecules/directory/MakerCard"
import type { Metadata } from "next"
import { buildPageMetadata } from "@/lib/metadata"
import {
  BROWSE_PATH,
  LEADERBOARD_PATH,
  LEADERBOARD_REWARDS_PATH,
  MEMBER_PRODUCTS_PATH,
  USERS_PATH,
  userPath,
} from "@/lib/routes"
import { getClerkUserByIdCached } from "@/lib/server/clerkUsers"

export const revalidate = 120

const baseMetadata = buildPageMetadata({
  title: "Makers — Shipyard",
  description:
    "Explore Shipyard makers, see what they have launched, and discover who is building momentum right now.",
  openGraph: {
    url: USERS_PATH,
    type: "website",
  },
  twitter: {
    card: "summary",
  },
})

export const metadata: Metadata = {
  ...baseMetadata,
  alternates: { canonical: USERS_PATH },
}

const makerMetrics = [
  {
    key: "totalCreators" as const,
    label: "Active makers",
  },
  {
    key: "totalProducts" as const,
    label: "Launches shipped",
  },
  {
    key: "totalUpvotes" as const,
    label: "Community upvotes",
  },
  {
    key: "totalInsights" as const,
    label: "Insights generated",
  },
] as const

type PublicUserSummary = Awaited<
  ReturnType<typeof getPublicUsersWithCounts>
>[number]

type MakerWithAvatar = PublicUserSummary & { avatarUrl: string | null }

export async function UsersIndexPageContent() {
  const [stats, users] = await Promise.all([
    getLeaderboardStats(),
    getPublicUsersWithCounts(60),
  ])

  const makersWithAvatars: MakerWithAvatar[] = await Promise.all(
    users.map(async (maker) => {
      let avatarUrl: string | null = null
      if (maker.clerkId) {
        try {
          const clerkUser = await getClerkUserByIdCached(maker.clerkId)
          avatarUrl = clerkUser.imageUrl ?? null
        } catch {
          avatarUrl = null
        }
      }
      return { ...maker, avatarUrl }
    }),
  )

  const topMakers = makersWithAvatars.slice(0, 3)
  const roster = makersWithAvatars.slice(3)

  return (
    <main className="relative isolate bg-white">
      <div className="relative mx-auto w-full max-w-[120rem] px-4 pb-24 pt-12 md:px-8">
        <div className="space-y-12">
          <DirectoryHeader
            stats={stats}
            eyebrow="Profile directory"
            title="Meet the people powering Shipyard"
            description="Explore the profiles behind Shipyard launches. Follow their work, track upcoming drops, and see who is earning community momentum."
            primaryAction={{
              label: "Submit your launch",
              href: MEMBER_PRODUCTS_PATH,
            }}
            secondaryAction={{
              label: "Explore featured products",
              href: `${BROWSE_PATH}?sort=featured`,
              variant: "outline",
            }}
            metrics={makerMetrics}
          />

          <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,1.05fr)]">
            <div className="flex flex-col gap-10">
              {topMakers.length > 0 ? (
                <section className="rounded-3xl border border-border/80 bg-background/78 p-6 shadow-sm shadow-black/5 md:p-8">
                  <DirectorySectionHeader
                    kicker="Featured makers"
                    title="Makers leading the launch cadence"
                    description="These makers have shipped the most products on Shipyard. Explore their profiles to track what they launch next."
                  />

                  <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {topMakers.map((maker, index) => {
                      const { name, initials, launches, avatarUrl } =
                        resolveMakerMeta(maker)
                      return (
                        <MakerCard
                          key={maker.id}
                          href={userPath(maker.id)}
                          name={name}
                          initials={initials}
                          launches={launches}
                          avatarUrl={avatarUrl}
                          rank={index + 1}
                          variant="highlight"
                        />
                      )
                    })}
                  </div>
                </section>
              ) : null}

              {roster.length > 0 ? (
                <section className="rounded-3xl border border-border/80 bg-background/78 p-6 shadow-sm shadow-black/5 md:p-8">
                  <DirectorySectionHeader
                    kicker="Crew directory"
                    title="Every maker currently featured"
                    description={`Showing ${users.length.toLocaleString()} makers with published launches.`}
                    action={
                      <Link
                        href={LEADERBOARD_REWARDS_PATH}
                        className="text-sm font-semibold text-[color:var(--brand-1)] hover:underline"
                      >
                        Watch the leaderboard
                      </Link>
                    }
                  />

                  <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {roster.map((maker) => {
                      const { name, initials, launches, avatarUrl } =
                        resolveMakerMeta(maker)
                      return (
                        <MakerCard
                          key={maker.id}
                          href={userPath(maker.id)}
                          name={name}
                          initials={initials}
                          launches={launches}
                          avatarUrl={avatarUrl}
                        />
                      )
                    })}
                  </div>
                </section>
              ) : users.length === 0 ? (
                <section className="rounded-3xl border border-dashed border-border/60 bg-background/78 p-6 text-center text-sm text-muted-foreground shadow-sm shadow-black/5 md:p-8">
                  No profiles to show yet. Check back as new builders publish
                  their first launch.
                </section>
              ) : null}
            </div>

            <aside className="flex flex-col gap-8">
              <DirectoryPromoCard
                eyebrow="Shipyard for makers"
                title="Ready to launch your next product?"
                description="Publish on Shipyard to get on the maker directory, earn homepage placements, and rally upvotes from the community."
                cta={{
                  label: "Submit your launch",
                  href: MEMBER_PRODUCTS_PATH,
                }}
                subtleCta={{
                  label: "Browse the launch playbook",
                  href: LEADERBOARD_PATH,
                }}
              />

              <DirectoryPromoCard
                eyebrow="Discover products"
                title="Explore what these makers are shipping"
                description="Jump straight into the product directory to see live launches, trending picks, and the campaigns your favorite makers recently shipped."
                cta={{
                  label: "Visit the directory",
                  href: BROWSE_PATH,
                  variant: "ghost",
                }}
                subtleCta={{
                  label: "Track the leaderboard",
                  href: LEADERBOARD_REWARDS_PATH,
                }}
              />
            </aside>
          </div>
        </div>
      </div>
    </main>
  )
}

function resolveMakerMeta(maker: MakerWithAvatar) {
  const first = maker.firstName?.trim() ?? ""
  const last = maker.lastName?.trim() ?? ""
  const name = `${first} ${last}`.trim() || "Shipyard maker"
  const initialsSource = name.split(/\s+/).slice(0, 2)
  const initials =
    initialsSource
      .map((segment) => segment.charAt(0).toUpperCase())
      .join("")
      .slice(0, 2) || "SY"
  const launches = maker.products.length

  return { name, initials, launches, avatarUrl: maker.avatarUrl }
}
