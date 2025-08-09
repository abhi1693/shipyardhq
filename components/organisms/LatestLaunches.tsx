import { ProductCard } from "@/components/molecules/ProductCard"
import { FeaturedProduct } from "@/types"
import UniformCard from "@/components/molecules/UniformCard"
import { PageSectionHeader } from "@/components/molecules/PageSectionHeader"
import PublicContainer from "@/components/layout/PublicContainer"

interface LatestLaunchesProps {
  products: FeaturedProduct[]
}

export function LatestLaunches({ products }: LatestLaunchesProps) {
  const now = new Date()

  if (!products || products.length === 0) return null

  return (
    <PublicContainer as="section" max="marketing" paddingY="py-16" className="border-b" innerClassName="space-y-8" fillScreen={false}>
      <PageSectionHeader
        title="Latest Launches"
        subtitle="Fresh off the launchpad. Explore what’s new."
      />

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
    </PublicContainer>
  )
}
