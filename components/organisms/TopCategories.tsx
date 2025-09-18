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
      paddingY="py-20"
      className="relative overflow-hidden border-b bg-background/80 backdrop-blur"
      innerClassName="relative"
      fillScreen={false}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-[color:var(--brand-2)/0.35] to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/3 -z-20 h-72 w-[70%] rounded-full bg-[radial-gradient(circle,var(--brand-2)/0.2,transparent_70%)] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-30 opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(11, 53, 94, 0.05) 1px, transparent 1px), linear-gradient(180deg, rgba(11, 53, 94, 0.05) 1px, transparent 1px)",
          backgroundSize: "120px 120px",
        }}
      />

      <div className="relative space-y-10">
        <PageSectionHeader
          align="center"
          title="Top Categories"
          subtitle="Chart your course by category."
        />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
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
      </div>
    </PublicContainer>
  )
}
