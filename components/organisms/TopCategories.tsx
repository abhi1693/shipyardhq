import Link from "next/link"

interface CategoryWithCount {
  id: string
  name: string
  slug: string
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
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">Top Categories</h2>
          <div className="mx-auto mt-3 h-1.5 w-16 rounded-full bg-[linear-gradient(90deg,var(--brand-1),var(--brand-3))]" />
          <p className="text-muted-foreground mt-2">
            Browse by product verticals.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/categories/${cat.slug}`}
              className="block p-4 rounded-lg border hover:border-primary transition-all bg-card text-card-foreground shadow-sm"
            >
              <div className="font-semibold text-base">{cat.name}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {cat._count.products} product{cat._count.products !== 1 && "s"}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
