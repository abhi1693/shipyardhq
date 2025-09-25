import prisma from "@/lib/prisma"
import {
  accelerateTags,
  cached,
  DEFAULT_TTL,
  DEFAULT_SWR,
  TAGS,
} from "@/lib/cache"
import { Prisma } from "@/lib/vendor/prisma/client"

const categoryProductSelect = {
  id: true,
  slug: true,
  name: true,
  logo: true,
  tagline: true,
  createdAt: true,
  analytics: { select: { upvotes: true, clicks: true } },
  category: { select: { name: true } },
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

type CategoryWithCount = Prisma.CategoryGetPayload<{
  include: {
    _count: {
      select: {
        products: {
          where: {
            status: "published",
          },
        },
      },
    },
  },
}>

export const getCategoriesWithCounts = cached(
  async () => {
    const categories = await prisma.category.findMany({
      where: {
        products: {
          some: {
            status: "published",
          },
        },
      },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            products: {
              where: {
                status: "published",
              },
            },
          },
        },
      },
      cacheStrategy: {
        ttl: DEFAULT_TTL.slow,
        swr: DEFAULT_SWR.slow,
        tags: accelerateTags([TAGS.categories]),
      },
    })
    return categories.map((cat: CategoryWithCount) => ({
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
      cacheStrategy: {
        ttl: DEFAULT_TTL.medium,
        swr: DEFAULT_SWR.medium,
        tags: accelerateTags([TAGS.categories, TAGS.category(String(slug))]),
      },
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
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        icon: true,
      },
      cacheStrategy: {
        ttl: DEFAULT_TTL.medium,
        swr: DEFAULT_SWR.medium,
        tags: accelerateTags([TAGS.categories, TAGS.category(String(slug))]),
      },
    })
    if (!category) return null
    const products = await prisma.product.findMany({
      where: {
        category: { slug },
      },
      select: categoryProductSelect,
      orderBy: { createdAt: "desc" },
      cacheStrategy: {
        ttl: DEFAULT_TTL.medium,
        swr: DEFAULT_SWR.medium,
        tags: accelerateTags([TAGS.products, TAGS.category(String(slug))]),
      },
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
