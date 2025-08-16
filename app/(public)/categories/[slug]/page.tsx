import { notFound } from "next/navigation"
import { Metadata } from "next"
import { getCategoryWithProducts } from "@/actions/public/categories/actions"
import { Badge } from "@/components/atoms/badge"
import { CategoryIcon } from "@/components/molecules/CategoryIcons"
import { Breadcrumbs } from "@/components/molecules/BreadCrumbs"
import PublicContainer from "@/components/layout/PublicContainer"
import { CategoryProductsClient } from "./client-products"
import { getFeaturedByCategorySlug } from "@/actions/public/products/featured"
import CategoryFeatured from "@/components/organisms/CategoryFeatured"
import { productHasFeature } from "@/lib/features"

interface CategoryPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params
  const data = await getCategoryWithProducts(slug)
  if (!data) return {}

  return {
    title: `${data.category.name} | Categories`,
    description: data.category.description,
  }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params
  const data = await getCategoryWithProducts(slug)

  if (!data) notFound()

  const { category, products } = data
  const featured = await getFeaturedByCategorySlug(slug, 7)

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

      {/* Category Featured Spotlight + Banner */}
      <CategoryFeatured products={featured} categoryName={category.name} />

      {/* Product Grid */}
      <CategoryProductsClient
        products={products.map((p) => ({
          ...p,
          // used by client to pin priority products first
          priority: productHasFeature(p, "priorityPlacement"),
          badges: p.ProductBadge?.filter(
            (pb: any) => !pb.expiresAt || new Date(pb.expiresAt) > new Date(),
          ).map((pb: any) => pb.badge),
        }))}
      />
    </PublicContainer>
  )
}
