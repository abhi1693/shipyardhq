import { CategoryCard } from "@/components/molecules/CategoryCard"
import { PageSectionHeader } from "@/components/molecules/PageSectionHeader"
import PublicContainer from "@/components/layout/PublicContainer"
import { categoryPath } from "@/lib/routes"

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
      paddingY="py-20"
      className="relative border-b border-border bg-white"
      innerClassName="relative"
      fillScreen={false}
    >

      <div className="relative space-y-10">
        <PageSectionHeader
          align="center"
          eyebrow="Navigation Charts"
          title="Chart Your Course"
          subtitle="Plot a heading by the categories captains visit most."
        />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {nonEmpty.map((cat) => (
            <CategoryCard
              key={cat.id}
              href={categoryPath(cat.slug)}
              name={cat.name}
              icon={cat.icon}
              description={cat.description}
              count={cat._count.products}
            />
          ))}
        </div>
      </div>
    </PublicContainer>
  )
}
