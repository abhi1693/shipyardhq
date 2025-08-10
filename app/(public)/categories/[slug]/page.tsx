import { notFound } from "next/navigation"
import { Metadata } from "next"
import { getCategoryWithProducts } from "@/actions/public/categories/actions"
import { Badge } from "@/components/atoms/badge"
import { CategoryIcon } from "@/components/molecules/CategoryIcons"
import { Breadcrumbs } from "@/components/molecules/BreadCrumbs"
import PublicContainer from "@/components/layout/PublicContainer"
import { CategoryProductsClient } from "./client-products"

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
    <PublicContainer max="7xl" paddingY="py-12" innerClassName="space-y-10">
      {/* Breadcrumbs */}
      <Breadcrumbs />

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))] text-white shadow-sm">
              <CategoryIcon
                icon={category.icon}
                size={18}
                className="text-white"
              />
            </span>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate">
              {category.name}
            </h1>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {products.length} product{products.length !== 1 && "s"}
          </Badge>
        </div>
        <p className="text-sm md:text-base text-muted-foreground max-w-3xl">
          {category.description}
        </p>
      </div>

      {/* Product Grid */}
      <CategoryProductsClient
        products={products.map((p) => ({
          ...p,
          badges: p.ProductBadge?.filter(
            (pb: any) => !pb.expiresAt || new Date(pb.expiresAt) > new Date(),
          ).map((pb: any) => pb.badge),
        }))}
      />
    </PublicContainer>
  )
}
