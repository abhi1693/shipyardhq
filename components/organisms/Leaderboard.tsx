import Link from "next/link"

import { FeaturedProduct } from "@/types"
import { DirectorySectionHeader } from "@/components/molecules/directory/SectionHeader"
import DirectoryProductList from "@/components/organisms/directory/DirectoryProductList"
import { LEADERBOARD_PATH } from "@/lib/routes"

function toListItem(entry: FeaturedProduct) {
  const { product } = entry
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    logo: product.logo,
    tagline: product.tagline,
    analytics: product.analytics ?? null,
    category: product.category ?? undefined,
  }
}

export function Leaderboard({ products }: { products: FeaturedProduct[] }) {
  if (!products || products.length === 0) return null

  const items = products.map(toListItem)

  return (
    <section className="rounded-3xl border border-border/80 bg-background/70 p-6 shadow-sm shadow-black/5 md:p-8">
      <DirectorySectionHeader
        kicker="Trending now"
        title="Community momentum from the leaderboard"
        description="Upvotes over the last day determine momentum. Explore the full leaderboard to compare categories and see longer trendlines."
        action={
          <Link
            href={LEADERBOARD_PATH}
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            View full leaderboard
          </Link>
        }
      />
      <div className="mt-8">
        <DirectoryProductList
          items={items}
          columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          metaConfig={{
            type: "rank",
            badgeClassName:
              "border-primary/30 bg-primary/10 text-primary",
          }}
        />
      </div>
    </section>
  )
}

export default Leaderboard
