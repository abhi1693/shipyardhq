import {
  Category,
  Product,
  ProductAnalytics,
  ProductVerification,
  User,
} from "@prisma/client"
import { ProductCard } from "./ProductCard"

type ProductWithMeta = Product & {
  category: Category
  user: User
  analytics: ProductAnalytics | null
  verification: ProductVerification | null
}

export default function ProductGrid({
  products,
  hasMore,
}: {
  products: ProductWithMeta[]
  hasMore: boolean
}) {
  return (
    <section className="space-y-10">
      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <div
            key={product.id}
            className="animate-fadeIn"
            style={{ animationDelay: "0.05s" }}
          >
            <ProductCard product={product} compact />
          </div>
        ))}
      </div>

      {/* Pagination Indicator */}
      {hasMore && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            More results available. Refine your filters or scroll for more.
          </p>
        </div>
      )}
    </section>
  )
}
