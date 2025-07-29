import { notFound } from "next/navigation"
import { Metadata } from "next"
import { getCategoryWithProducts } from "@/actions/public/categories/actions"
import { Badge } from "@/components/atoms/badge"
import { ProductCard } from "@/components/molecules/ProductCard"

interface CategoryPageProps {
  params: { slug: string }
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const data = await getCategoryWithProducts(params.slug)
  if (!data) return {}

  return {
    title: `${data.category.name} | Categories`,
    description: data.category.description,
  }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const data = await getCategoryWithProducts(params.slug)

  if (!data) notFound()

  const { category, products } = data

  return (
    <div className="min-h-screen px-4 md:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{category.name}</h1>
        <p className="text-muted-foreground max-w-3xl">
          {category.description}
        </p>
        <div className="flex gap-2">
          <Badge>
            {products.length} product{products.length !== 1 && "s"}
          </Badge>
        </div>
      </div>

      {/* Product Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Products</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} compact />
          ))}
        </div>
      </div>
    </div>
  )
}
