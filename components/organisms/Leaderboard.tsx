import { FeaturedProduct } from "@/types"
import { PageSectionHeader } from "@/components/molecules/PageSectionHeader"
import PublicContainer from "@/components/layout/PublicContainer"
import FeaturedProductGrid from "@/components/molecules/FeaturedProductGrid"
import { getWaveBackground } from "@/lib/nautical"

interface LeaderboardProps {
  products: FeaturedProduct[]
}

export function Leaderboard({ products }: LeaderboardProps) {
  if (!products || products.length === 0) return null

  return (
    <PublicContainer
      as="section"
      max="marketing"
      paddingY="py-20"
      className="relative overflow-hidden border-b bg-background/85 shadow-[0px_40px_110px_-80px_rgba(7,58,104,0.9)] backdrop-blur"
      innerClassName="relative"
      fillScreen={false}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-[color:var(--brand-1)/0.35] to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-30"
        style={{
          backgroundImage:
            "radial-gradient(110%_85%_at_80%_110%, rgba(7, 54, 102, 0.24), transparent 76%), radial-gradient(85%_75%_at_15%_25%, rgba(6, 33, 60, 0.2), transparent 72%)",
          maskImage:
            "radial-gradient(80%_100%_at_50%_95%, rgba(0,0,0,0.95), transparent 75%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 opacity-30"
        style={{
          ...getWaveBackground("240px 90px"),
          backgroundPosition: "0 60%",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[-24%] bottom-[-48px] -z-40 h-52 rounded-[50%] bg-[radial-gradient(78%_100%_at_50%_100%,var(--brand-1)/0.22,transparent_82%)] blur-3xl"
      />

      <div className="relative space-y-10">
        <PageSectionHeader
          eyebrow="Fleet Standings"
          title="Trending Fleet"
          subtitle="Vessels pulling ahead on the tide of community upvotes."
          action={
            <a
              href="/leaderboard"
              className="hidden items-center rounded-md border border-[color:var(--brand-1)/0.35] px-3 py-1.5 text-sm text-[color:var(--brand-1)] shadow-[0px_15px_40px_-30px_rgba(7,58,104,0.85)] transition-colors hover:bg-[color:var(--brand-1)/0.05] md:inline-flex"
            >
              See leaderboard
            </a>
          }
        />

        <FeaturedProductGrid items={products} />
      </div>
    </PublicContainer>
  )
}
