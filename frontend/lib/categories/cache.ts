import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { getCategoriesWithCounts } from "@/actions/public/categories/actions"
import { getTopCategories } from "@/actions/public/products/featured"

type CategoriesWithCounts = Awaited<ReturnType<typeof getCategoriesWithCounts>>

const HIGHLIGHT_CATEGORY_LIMIT = 4

export type CategoriesPagePayload = {
  categories: CategoriesWithCounts
  totalProducts: number
  averagePerCategory: number
  highlightCategories: CategoriesWithCounts
  busiestCategory: CategoriesWithCounts[number] | null
  categoryCount: number
}

export const getCategoriesPagePayload = cached(
  async (): Promise<CategoriesPagePayload> => {
    const [categories, highlightSource] = await Promise.all([
      getCategoriesWithCounts(),
      getTopCategories(HIGHLIGHT_CATEGORY_LIMIT),
    ])
    const totalProducts = categories.reduce(
      (sum: number, category: (typeof categories)[number]) =>
        sum + (category.count ?? 0),
      0,
    )
    const categoryCount = categories.length
    const averagePerCategory =
      categoryCount > 0
        ? Math.max(1, Math.round(totalProducts / categoryCount))
        : 0
    const highlightCategories: CategoriesWithCounts = highlightSource.map(
      (category: (typeof highlightSource)[number]) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        icon: category.icon,
        count: category._count.products,
      }),
    )
    const busiestCategory = highlightCategories[0] ?? null

    return {
      categories,
      totalProducts,
      averagePerCategory,
      highlightCategories,
      busiestCategory,
      categoryCount,
    }
  },
  "categories:page:payload",
  {
    ttl: DEFAULT_TTL.slow,
    tags: () => [TAGS.categoryDirectory, TAGS.categories, TAGS.products],
  },
)
