import { Metadata } from "next"
import { Badge } from "@/components/atoms/badge"
import Link from "next/link"
import { getCategoriesWithCounts } from "@/actions/public/categories/actions"

export const metadata: Metadata = {
  title: "Categories",
  description:
    "Explore top startup categories and discover innovative products.",
}

export default async function CategoriesPage() {
  const categories = await getCategoriesWithCounts()

  return (
    <div className="min-h-screen w-full px-4 md:px-8 py-10">
      {/* Header */}
      <div className="mb-8 space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">
          Discover Top Startup Categories
        </h1>
        <p className="text-muted-foreground max-w-3xl">
          Explore our curated categories to discover innovative startups and
          solutions shaping the future.
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Showing <strong>{categories.length}</strong> categories
        </p>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/categories/${cat.slug}`}
            className="border rounded-xl p-4 bg-background hover:shadow-md transition-all flex flex-col gap-3"
          >
            <h3 className="text-base font-semibold">{cat.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {cat.description}
            </p>
            <div className="mt-auto">
              <Badge
                className={
                  cat.count === 0
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary text-primary-foreground"
                }
              >
                {cat.count} product{cat.count !== 1 && "s"}
              </Badge>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
