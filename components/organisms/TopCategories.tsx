import { CategoryCard } from "@/components/molecules/CategoryCard"
import { PageSectionHeader } from "@/components/molecules/PageSectionHeader"
import PublicContainer from "@/components/layout/PublicContainer"

interface CategoryWithCount {
  id: string
  name: string
  slug: string
  description: string
  icon: string
  _count: {
    products: number
  }
}

interface TopCategoriesProps {
  categories: CategoryWithCount[]
}

export function TopCategories({ categories }: TopCategoriesProps) {
  const nonEmpty = categories.filter((c) => (c?._count?.products ?? 0) > 0)

  if (nonEmpty.length === 0) return null

  return (
    <PublicContainer
      as="section"
      max="7xl"
      paddingY="py-16"
      className="border-b"
      innerClassName="space-y-8"
      fillScreen={false}
    >
      <PageSectionHeader
        title="Top Categories"
        subtitle="Browse by product verticals."
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {nonEmpty.map((cat) => (
          <CategoryCard
            key={cat.id}
            href={`/categories/${cat.slug}`}
            name={cat.name}
            icon={cat.icon}
            description={cat.description}
            count={cat._count.products}
          />
        ))}
      </div>
    </PublicContainer>
  )
}
