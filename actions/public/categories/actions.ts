import prisma from "@/lib/prisma"
import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"

export const getCategoriesWithCounts = cached(
  async () => {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { products: true },
        },
      },
    })
    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      icon: cat.icon,
      count: cat._count.products,
    }))
  },
  "categories:with-counts",
  { ttl: DEFAULT_TTL.slow, tags: () => [TAGS.categories] },
)

export const getCategoryMeta = cached(
  async (slug: string) =>
    prisma.category.findUnique({
      where: { slug },
      select: { name: true, description: true },
    }),
  "category:meta",
  {
    ttl: DEFAULT_TTL.medium,
    tags: ([slug]) => [TAGS.categories, TAGS.category(String(slug))],
  },
)

export const getCategoryWithProducts = cached(
  async (slug: string) => {
    const category = await prisma.category.findUnique({
      where: { slug },
    })
    if (!category) return null
    const products = await prisma.product.findMany({
      where: {
        category: { slug },
      },
      include: {
        category: true,
        user: true,
        analytics: true,
        verification: true,
        ProductBadge: true,
        // Include plan assignments to detect priority placement
        plan: {
          include: {
            assignments: {
              include: { feature: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })
    return { category, products }
  },
  "category:with-products",
  {
    ttl: DEFAULT_TTL.medium,
    tags: ([slug]) => [
      TAGS.categories,
      TAGS.products,
      TAGS.category(String(slug)),
    ],
  },
)
