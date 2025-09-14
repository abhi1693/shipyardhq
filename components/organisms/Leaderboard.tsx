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
      paddingY="py-16"
      className="border-b"
      innerClassName="space-y-8"
      fillScreen={false}
    >
      <PageSectionHeader
        title="Trending"
        subtitle="Top of the fleet by upvotes."
        action={
          <a
            href="/leaderboard"
            className="hidden md:inline-flex items-center rounded-md border px-3 py-1.5 text-sm text-foreground hover:bg-accent transition-colors"
          >
            See leaderboard
          </a>
        }
      />

      <FeaturedProductGrid items={products} />
    </PublicContainer>
  )
}
