import { CategoryCard } from "@/components/molecules/CategoryCard"

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
  return (
    <section className="py-16 border-b" id="categories">
      <div className="max-w-7xl mx-auto px-4 space-y-8">
        <div className="text-left">
          <h2 className="text-3xl font-bold tracking-tight">Top Categories</h2>
          <div className="mt-3 h-1.5 w-16 rounded-full bg-[linear-gradient(90deg,var(--brand-1),var(--brand-3))]" />
          <p className="text-muted-foreground mt-2">
            Browse by product verticals.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {categories.map((cat) => (
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
      </div>
    </section>
  )
}
