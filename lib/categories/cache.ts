import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { getCategoriesWithCounts } from "@/actions/public/categories/actions"

type CategoriesWithCounts = Awaited<ReturnType<typeof getCategoriesWithCounts>>

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
    const categories = await getCategoriesWithCounts()
    const totalProducts = categories.reduce(
      (sum, category) => sum + (category.count ?? 0),
      0,
    )
    const categoryCount = categories.length
    const averagePerCategory =
      categoryCount > 0
        ? Math.max(1, Math.round(totalProducts / categoryCount))
        : 0
    const highlightCategories = categories.slice(0, 4)
    const busiestCategory = categories[0] ?? null

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
    tags: () => [
      TAGS.categoryDirectory,
      TAGS.categories,
      TAGS.products,
    ],
  },
)
