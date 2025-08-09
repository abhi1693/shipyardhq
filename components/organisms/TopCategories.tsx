import Link from "next/link"
import { Badge } from "@/components/atoms/badge"
import { CategoryIcon } from "@/components/molecules/CategoryIcons"

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
              className="group block h-full rounded-lg border bg-card p-4 text-card-foreground shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[linear-gradient(90deg,var(--brand-1),var(--brand-3))] text-white shadow-sm">
                    <CategoryIcon icon={cat.icon} size={16} className="text-white" />
                  </span>
                  <div className="font-semibold text-sm md:text-base truncate">
                    {cat.name}
                  </div>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {cat._count.products} product
                  {cat._count.products !== 1 && "s"}
                </Badge>
              </div>
              <p className="mt-2 text-xs md:text-sm text-muted-foreground line-clamp-2">
                {cat.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
