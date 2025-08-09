import { ProductCard } from "@/components/molecules/ProductCard"
import CTAFeatureYourProductCard from "@/components/molecules/CTAFeatureYourProductCard"
import { FeaturedProduct } from "@/types"
import UniformCard from "@/components/molecules/UniformCard"
import { PageSectionHeader } from "@/components/molecules/PageSectionHeader"
import PublicContainer from "@/components/layout/PublicContainer"

export function FeaturedHighlights({
  products,
}: {
  products: FeaturedProduct[]
}) {
  return (
    <PublicContainer as="section" max="marketing" paddingY="py-16" className="border-b" innerClassName="space-y-8" fillScreen={false}>
      <PageSectionHeader
        title="Featured Highlights"
        subtitle="Curated products making waves right now."
        action={
          <a
            href="/browse"
            className="hidden md:inline-flex items-center rounded-md border px-3 py-1.5 text-sm text-foreground hover:bg-accent transition-colors"
          >
            View all
          </a>
        }
      />

      {/* Grid */}
      <div className="grid grid-cols-1 items-stretch sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-5">
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
    </PublicContainer>
  )
}
