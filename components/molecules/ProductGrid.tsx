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
    <>
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {hasMore && (
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            More results available.
          </p>
        </div>
      )}
    </>
  )
}
