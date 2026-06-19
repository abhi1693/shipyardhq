"use server"

import prisma from "@/lib/prisma"
import { Prisma } from "@/lib/vendor/prisma/client"
import { buildPublicDiscoveryProductWhere } from "@/lib/products/public-discovery"
import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"

export async function getCategories(args: Prisma.CategoryFindManyArgs = {}) {
  try {
    return await prisma.category.findMany({
      orderBy: { createdAt: "desc" },
      ...args,
    })
  } catch (error) {
    console.error("Error fetching categories:", error)
    throw new Error("Failed to fetch categories")
  }
}

export const getUseCasesWithCounts = cached(
  async () => {
    try {
      const useCases = await prisma.useCase.findMany({
        orderBy: { createdAt: "desc" },
        where: {
          categories: {
            some: {
              category: {
                products: {
                  some: buildPublicDiscoveryProductWhere(),
                },
              },
            },
          },
        },
        include: {
          categories: {
            where: {
              category: {
                products: {
                  some: buildPublicDiscoveryProductWhere(),
                },
              },
            },
            select: {
              category: {
                select: {
                  id: true,
                  _count: {
                    select: {
                      products: { where: buildPublicDiscoveryProductWhere() },
                    },
                  },
                },
              },
            },
          },
        },
      })

      type UseCaseWithRelations = (typeof useCases)[number]
      type UseCaseCategoryRelation = UseCaseWithRelations["categories"][number]

      return useCases
        .map((useCase: UseCaseWithRelations) => ({
          id: useCase.id,
          slug: useCase.slug,
          label: useCase.label,
          productCount: useCase.categories.reduce(
            (total: number, relation: UseCaseCategoryRelation) => {
              const count = relation.category?._count?.products ?? 0
              return total + count
            },
            0,
          ),
        }))
        .filter((useCase: { productCount: number }) => useCase.productCount > 0)
    } catch (error) {
      console.error("Error fetching use cases with counts:", error)
      throw new Error("Failed to fetch use cases with counts")
    }
  },
  "catalog:use-cases-with-counts",
  {
    ttl: DEFAULT_TTL.slow,
    tags: () => [TAGS.useCases, TAGS.categories, TAGS.products],
  },
)

export async function getAlternativeProducts(
  args: Prisma.AlternativeProductFindManyArgs = {},
) {
  try {
    const query: Prisma.AlternativeProductFindManyArgs = {
      orderBy: { createdAt: "desc" },
      ...(args.include || args.select
        ? {}
        : {
            include: {
              categories: true,
              _count: {
                select: { products: true },
              },
            },
          }),
      ...args,
    }

    return await prisma.alternativeProduct.findMany(query)
  } catch (error) {
    console.error("Error fetching alternative products:", error)
    throw new Error("Failed to fetch alternative products")
  }
}
