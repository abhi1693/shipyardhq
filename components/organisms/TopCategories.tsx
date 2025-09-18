import { CategoryCard } from "@/components/molecules/CategoryCard"
import { PageSectionHeader } from "@/components/molecules/PageSectionHeader"
import PublicContainer from "@/components/layout/PublicContainer"
import { getWaveBackground } from "@/lib/nautical"

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
      className="relative overflow-hidden border-b bg-background/85 shadow-[0px_45px_120px_-85px_rgba(7,58,104,0.95)] backdrop-blur"
      innerClassName="relative"
      fillScreen={false}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-[color:var(--brand-2)/0.35] to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-30"
        style={{
          backgroundImage:
            "radial-gradient(120%_90%_at_50%_-10%, rgba(8, 56, 102, 0.22), transparent 75%), radial-gradient(85%_70%_at_15%_25%, rgba(6, 28, 54, 0.2), transparent 72%)",
          maskImage:
            "radial-gradient(90%_100%_at_50%_0%, rgba(0,0,0,0.95), transparent 78%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 opacity-30"
        style={{
          ...getWaveBackground("240px 90px"),
          backgroundPosition: "0 55%",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[-30%] bottom-[-45px] -z-40 h-52 rounded-[50%] bg-[radial-gradient(78%_100%_at_50%_0%,var(--brand-2)/0.22,transparent_82%)] blur-3xl"
      />

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
