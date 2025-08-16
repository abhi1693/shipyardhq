import prisma from "@/lib/prisma"

export async function getCategoriesWithCounts() {
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
}

export async function getCategoryWithProducts(slug: string) {
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
}
