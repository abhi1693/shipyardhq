import { ProductCard } from "@/components/molecules/ProductCard"
import { FeaturedProduct } from "@/types"
import UniformCard from "@/components/molecules/UniformCard"

interface LeaderboardProps {
  products: FeaturedProduct[]
}

export function Leaderboard({ products }: LeaderboardProps) {
  const now = new Date()

  if (!products || products.length === 0) return null

  return (
    <section className="py-16 border-b" id="leaderboard">
      <div className="max-w-[84rem] mx-auto px-4 space-y-8">
        <div className="text-left">
          <h2 className="text-3xl font-bold tracking-tight">Trending Today</h2>
          <div className="mt-3 h-1.5 w-16 rounded-full bg-[linear-gradient(90deg,var(--brand-3),var(--brand-1),var(--brand-2))]" />
          <p className="text-muted-foreground mt-2">
            Most upvoted products in the past 24 hours.
          </p>
        </div>

        <div className="grid grid-cols-1 items-stretch sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-5">
          {products.map(({ product, id }) => {
            const p = product
            return (
              <UniformCard key={id} size="normal">
                <ProductCard
                  product={{
                    id: p.id,
                    name: p.name,
                    logo: p.logo,
                    tagline: p.tagline,
                  }}
                  badges={p.ProductBadge.filter(
                    (pb) => !pb.expiresAt || new Date(pb.expiresAt) > now,
                  ).map((pb) => pb.badge)}
                  upvotes={p.analytics?.upvotes ?? 0}
                  author={
                    p.user
                      ? {
                          name: `${p.user.firstName ?? ""} ${
                            p.user.lastName ?? ""
                          }`.trim(),
                          initial: p.user.firstName?.[0] ?? "U",
                        }
                      : undefined
                  }
                  category={p.category?.name}
                />
              </UniformCard>
            )
          })}
        </div>
      </div>
    </section>
  )
}
