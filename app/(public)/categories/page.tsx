import { Metadata } from "next"
import { getCategoriesWithCounts } from "@/actions/public/categories/actions"
import { CategoryCard } from "@/components/molecules/CategoryCard"
import PublicContainer from "@/components/layout/PublicContainer"
import { PageHeader } from "@/components/molecules/PageHeader"

export const metadata: Metadata = {
  title: "Categories",
  description:
    "Explore top startup categories and discover innovative products.",
}

export default async function CategoriesPage() {
  const categories = await getCategoriesWithCounts()

  return (
    <PublicContainer max="7xl">
      {/* Header */}
      <div className="mb-8">
        <PageHeader
          title="Discover Top Startup Categories"
          subtitle="Explore our curated categories to discover innovative startups and solutions shaping the future."
          meta={
            <>
              Showing <strong>{categories.length}</strong> categories
            </>
          }
        />
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {categories.map((cat) => (
          <CategoryCard
            key={cat.id}
            href={`/categories/${cat.slug}`}
            name={cat.name}
            icon={cat.icon}
            description={cat.description}
            count={cat.count}
          />
        ))}
      </div>
    </PublicContainer>
  )
}
