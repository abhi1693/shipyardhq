import { ProductCard } from "@/components/molecules/ProductCard"
import CTAFeatureYourProductCard from "@/components/molecules/CTAFeatureYourProductCard"
import { FeaturedProduct } from "@/types"
import UniformCard from "@/components/molecules/UniformCard"

export function FeaturedHighlights({
  products,
}: {
  products: FeaturedProduct[]
}) {
  return (
    <section className="py-16 border-b">
      <div className="max-w-[84rem] mx-auto px-4 space-y-8">
        {/* Header */}
        <div className="flex items-end justify-between gap-4">
          <div className="text-left">
            <h2 className="text-3xl font-bold tracking-tight">
              Featured Highlights
            </h2>
            <div className="mt-3 h-1.5 w-16 rounded-full bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))]" />
            <p className="text-muted-foreground mt-2">
              Curated products making waves right now.
            </p>
          </div>
          <a
            href="/browse"
            className="hidden md:inline-flex items-center rounded-md border px-3 py-1.5 text-sm text-foreground hover:bg-accent transition-colors"
          >
            View all
          </a>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 items-stretch sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-5">
          {products.length === 0 && (
            <div className="col-span-full rounded-lg border bg-card p-6 text-center text-muted-foreground">
              No featured products yet. Be the first to{" "}
              <a className="underline" href="/member/products/add">
                submit yours
              </a>
              .
            </div>
          )}
          {products.map(({ id, product }) => (
            <UniformCard key={id} size="normal">
              <ProductCard
                product={{
                  id: product.id,
                  name: product.name,
                  logo: product.logo,
                  tagline: product.tagline,
                }}
                badges={product.ProductBadge.map((pb) => pb.badge)}
                upvotes={product.analytics?.upvotes ?? 0}
                author={
                  product.user
                    ? {
                        name: `${product.user.firstName ?? ""} ${
                          product.user.lastName ?? ""
                        }`.trim(),
                        initial: product.user.firstName?.[0] ?? "U",
                      }
                    : undefined
                }
                category={product.category?.name}
              />
            </UniformCard>
          ))}

          {/* Always show the promo card at the end */}
          <UniformCard size="normal">
            <CTAFeatureYourProductCard />
          </UniformCard>
        </div>
      </div>
    </section>
  )
}
