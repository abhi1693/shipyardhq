import { ProductCard } from "@/components/molecules/ProductCard"
import { FeaturedProduct } from "@/types"

interface LeaderboardProps {
  products: FeaturedProduct[]
}

export function Leaderboard({ products }: LeaderboardProps) {
  const now = new Date()

  return (
    <section className="py-16 border-b" id="leaderboard">
      <div className="max-w-7xl mx-auto px-4 space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">Trending Today</h2>
          <p className="text-muted-foreground mt-2">
            Most upvoted products in the past 24 hours.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {products.map(({ product, id }) => {
            const p = product
            return (
              <ProductCard
                key={id}
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
            )
          })}
        </div>
      </div>
    </section>
  )
}
