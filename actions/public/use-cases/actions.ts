import prisma from "@/lib/prisma"
import {
  accelerateTags,
  cached,
  DEFAULT_SWR,
  DEFAULT_TTL,
  TAGS,
} from "@/lib/cache"
import { Prisma } from "@/lib/vendor/prisma/client"

const useCaseProductSelect = {
  id: true,
  slug: true,
  name: true,
  logo: true,
  tagline: true,
  createdAt: true,
  analytics: { select: { upvotes: true, clicks: true } },
  category: { select: { id: true, name: true, slug: true } },
  ProductBadge: {
    select: {
      badge: true,
      expiresAt: true,
    },
  },
  plan: {
    select: {
      assignments: {
        where: { enabled: true },
        select: {
          enabled: true,
          feature: { select: { key: true } },
        },
      },
    },
  },
} satisfies Prisma.ProductSelect

type UseCaseProduct = Prisma.ProductGetPayload<{
  select: typeof useCaseProductSelect
}>

type UseCaseSummary = {
  id: string
  slug: string
  label: string
  updatedAt: Date
  productCount: number
}

type UseCaseCategory = {
  id: string
  name: string
  slug: string
  description: string
  icon: string
  productCount: number
}

type UseCaseWithProducts = {
  useCase: {
    id: string
    label: string
    slug: string
    createdAt: Date
    updatedAt: Date
  }
  categories: UseCaseCategory[]
  products: UseCaseProduct[]
  productCount: number
}

export const getPublicUseCasesWithCounts = cached(
  async (): Promise<UseCaseSummary[]> => {
    const useCases = await prisma.useCase.findMany({
      orderBy: { label: "asc" },
      select: {
        id: true,
        label: true,
        slug: true,
        updatedAt: true,
      },
      cacheStrategy: {
        ttl: DEFAULT_TTL.slow,
        swr: DEFAULT_SWR.slow,
        tags: accelerateTags([TAGS.useCases]),
      },
    })

    if (useCases.length === 0) return []

    const results = await Promise.all(
      useCases.map(async (useCase) => {
        const productCount = await prisma.product.count({
          where: {
            status: "published",
            category: {
              useCases: {
                some: { useCaseId: useCase.id },
              },
            },
          },
          cacheStrategy: {
            ttl: DEFAULT_TTL.medium,
            swr: DEFAULT_SWR.medium,
            tags: accelerateTags([
              TAGS.products,
              TAGS.useCases,
              TAGS.usecase(useCase.slug),
            ]),
          },
        })

        return {
          id: useCase.id,
          slug: useCase.slug,
          label: useCase.label,
          updatedAt: useCase.updatedAt,
          productCount,
        }
      }),
    )

    return results
  },
  "use-cases:public-with-counts",
  {
    ttl: DEFAULT_TTL.slow,
    tags: () => [TAGS.useCases],
  },
)

export const getPublicUseCaseMeta = cached(
  async (slug: string) => {
    const useCase = await prisma.useCase.findUnique({
      where: { slug },
      select: {
        id: true,
        label: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
      },
      cacheStrategy: {
        ttl: DEFAULT_TTL.medium,
        swr: DEFAULT_SWR.medium,
        tags: accelerateTags([TAGS.useCases, TAGS.usecase(slug)]),
      },
    })

    if (!useCase) return null

    const productCount = await prisma.product.count({
      where: {
        status: "published",
        category: {
          useCases: {
            some: { useCaseId: useCase.id },
          },
        },
      },
      cacheStrategy: {
        ttl: DEFAULT_TTL.medium,
        swr: DEFAULT_SWR.medium,
        tags: accelerateTags([
          TAGS.products,
          TAGS.useCases,
          TAGS.usecase(slug),
        ]),
      },
    })

    return { ...useCase, productCount }
  },
  "use-case:public-meta",
  {
    ttl: DEFAULT_TTL.medium,
    tags: ([slug]) => [TAGS.useCases, TAGS.usecase(String(slug))],
  },
)

export const getPublicUseCaseWithProducts = cached(
  async (slug: string): Promise<UseCaseWithProducts | null> => {
    const useCase = await prisma.useCase.findUnique({
      where: { slug },
      select: {
        id: true,
        label: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
      },
      cacheStrategy: {
        ttl: DEFAULT_TTL.medium,
        swr: DEFAULT_SWR.medium,
        tags: accelerateTags([TAGS.useCases, TAGS.usecase(slug)]),
      },
    })

    if (!useCase) return null

    const products: UseCaseProduct[] = await prisma.product.findMany({
      where: {
        status: "published",
        category: {
          useCases: {
            some: { useCaseId: useCase.id },
          },
        },
      },
      select: useCaseProductSelect,
      orderBy: { createdAt: "desc" },
      cacheStrategy: {
        ttl: DEFAULT_TTL.medium,
        swr: DEFAULT_SWR.medium,
        tags: accelerateTags([
          TAGS.products,
          TAGS.useCases,
          TAGS.usecase(slug),
        ]),
      },
    })

    if (products.length === 0) {
      return null
    }

    const categoryMap = new Map<string, number>()
    for (const product of products) {
      const categoryId = product.category?.id
      if (!categoryId) continue
      categoryMap.set(categoryId, (categoryMap.get(categoryId) ?? 0) + 1)
    }

    const categoriesRaw = await prisma.category.findMany({
      where: {
        id: { in: Array.from(categoryMap.keys()) },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        icon: true,
      },
      orderBy: { name: "asc" },
      cacheStrategy: {
        ttl: DEFAULT_TTL.medium,
        swr: DEFAULT_SWR.medium,
        tags: accelerateTags([
          TAGS.categories,
          TAGS.useCases,
          TAGS.usecase(slug),
        ]),
      },
    })

    const categories: UseCaseCategory[] = categoriesRaw
      .map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        icon: category.icon,
        productCount: categoryMap.get(category.id) ?? 0,
      }))
      .filter((category) => category.productCount > 0)
      .sort((a, b) => {
        if (b.productCount !== a.productCount) {
          return b.productCount - a.productCount
        }
        return a.name.localeCompare(b.name)
      })

    return {
      useCase,
      categories,
      products,
      productCount: products.length,
    }
  },
  "use-case:public-with-products",
  {
    ttl: DEFAULT_TTL.medium,
    tags: ([slug]) => [
      TAGS.useCases,
      TAGS.usecase(String(slug)),
      TAGS.products,
      TAGS.categories,
    ],
  },
)
