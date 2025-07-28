import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

interface GetBrowseProductsOptions {
  useCaseSlug?: string
  categorySlug?: string
  verified?: boolean
  sort?: "new" | "trending" | "votes" | "az"
  page?: number
  pageSize?: number
}

export async function getBrowseProducts({
  useCaseSlug,
  categorySlug,
  verified,
  sort = "new",
  page = 1,
  pageSize = 20,
}: GetBrowseProductsOptions) {
  const skip = (page - 1) * pageSize

  let categoryIds: string[] | undefined

  if (useCaseSlug) {
    const useCase = await prisma.useCase.findUnique({
      where: { slug: useCaseSlug },
      include: {
        categories: { select: { categoryId: true } },
      },
    })

    if (!useCase) return { products: [], hasMore: false }

    categoryIds = useCase.categories.map((uc) => uc.categoryId)
  }

  if (categorySlug) {
    const category = await prisma.category.findUnique({
      where: { slug: categorySlug },
    })
    if (!category) return { products: [], hasMore: false }
    categoryIds = [category.id]
  }

  const where: Prisma.ProductWhereInput = {
    ...(verified ? { verification: { isVerified: true } } : {}),
    ...(categoryIds?.length ? { categoryId: { in: categoryIds } } : {}),
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "votes"
      ? { analytics: { upvotes: "desc" } }
      : sort === "trending"
        ? { analytics: { views: "desc" } }
        : sort === "az"
          ? { name: "asc" }
          : { createdAt: "desc" }

  const products = await prisma.product.findMany({
    where,
    orderBy,
    skip,
    take: pageSize,
    include: {
      category: true,
      user: true,
      verification: true,
      analytics: true,
    },
  })

  const total = await prisma.product.count({ where })
  const hasMore = skip + products.length < total

  return { products, hasMore }
}
