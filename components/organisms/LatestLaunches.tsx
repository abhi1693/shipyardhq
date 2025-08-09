import { ProductCard } from "@/components/molecules/ProductCard"
import { FeaturedProduct } from "@/types"
import UniformCard from "@/components/molecules/UniformCard"

interface LatestLaunchesProps {
  products: FeaturedProduct[]
}

export function LatestLaunches({ products }: LatestLaunchesProps) {
  const now = new Date()

  return (
    <section className="py-16 border-b" id="latest">
      <div className="max-w-[84rem] mx-auto px-4 space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">Latest Launches</h2>
          <div className="mx-auto mt-3 h-1.5 w-16 rounded-full bg-[linear-gradient(90deg,var(--brand-2),var(--brand-3),var(--brand-1))]" />
          <p className="text-muted-foreground mt-2">
            Fresh off the launchpad. Explore what’s new.
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
