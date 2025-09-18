import { FeaturedProduct } from "@/types"
import { PageSectionHeader } from "@/components/molecules/PageSectionHeader"
import PublicContainer from "@/components/layout/PublicContainer"
import FeaturedProductGrid from "@/components/molecules/FeaturedProductGrid"

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
      className="relative overflow-hidden border-b bg-background/82 backdrop-blur"
      innerClassName="relative"
      fillScreen={false}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-[color:var(--brand-1)/0.35] to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 right-[15%] -z-20 h-72 w-[65%] rounded-full bg-[radial-gradient(circle,var(--brand-1)/0.22,transparent_70%)] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-30 opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(11, 53, 94, 0.05) 1px, transparent 1px), linear-gradient(180deg, rgba(11, 53, 94, 0.05) 1px, transparent 1px)",
          backgroundSize: "120px 120px",
        }}
      />

      <div className="relative space-y-10">
        <PageSectionHeader
          title="Trending"
          subtitle="Top of the fleet by upvotes."
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
