import prisma from "@/lib/prisma"
import { Prisma } from "@/lib/vendor/prisma/client"
import {
  accelerateTags,
  cached,
  DEFAULT_TTL,
  DEFAULT_SWR,
  TAGS,
} from "@/lib/cache"
import { getActiveUserByClerkId } from "@/lib/server/userStatus"

type PublicProduct = Prisma.ProductGetPayload<{
  include: {
    category: {
      include: {
        useCases: {
          include: { useCase: true }
        }
      }
    }
    user: {
      select: {
        id: true
        firstName: true
        lastName: true
        email: true
      }
    }
    metadata: true
    analytics: true
    verification: true
    ProductMedia: true
    ProductBadge: true
    plan: {
      include: {
        assignments: {
          include: { feature: true }
        }
      }
    }
    organization: {
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true
                firstName: true
                lastName: true
                email: true
              }
            }
          }
        }
      }
    }
  }
}>

async function fetchPublicProduct(where: Prisma.ProductWhereUniqueInput) {
  const tagSet = new Set<string>([TAGS.products])
  if (where.id) tagSet.add(TAGS.product(String(where.id)))
  if (where.slug) tagSet.add(TAGS.product(String(where.slug)))

  const product: PublicProduct | null = await prisma.product.findUnique({
    where,
    include: {
      category: {
        include: {
          useCases: {
            include: { useCase: true },
          },
        },
      },
      user: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      metadata: true,
      analytics: true,
      verification: true,
      ProductMedia: { orderBy: { createdAt: "asc" } },
      ProductBadge: true,
      plan: {
        include: {
          assignments: {
            include: { feature: true },
          },
        },
      },
      organization: {
        include: {
          memberships: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
    cacheStrategy: {
      ttl: DEFAULT_TTL.medium,
      swr: DEFAULT_SWR.medium,
      tags: accelerateTags(Array.from(tagSet)),
    },
  })

  if (!product) return null

  const activeBadges = product.ProductBadge.filter(
    (badge: PublicProduct["ProductBadge"][number]) =>
      !badge.expiresAt || badge.expiresAt > new Date(),
  ).map((badge) => badge.badge)

  return { ...product, badges: activeBadges }
}

export const getPublicProduct = cached(
  async (id: string) => fetchPublicProduct({ id }),
  "product:public",
  {
    ttl: DEFAULT_TTL.medium,
    tags: ([id]) => [TAGS.products, TAGS.product(String(id))],
  },
)

export const getPublicProductBySlug = cached(
  async (slug: string) => fetchPublicProduct({ slug }),
  "product:public-by-slug",
  {
    ttl: DEFAULT_TTL.medium,
    tags: ([slug]) => [TAGS.products, TAGS.product(String(slug))],
  },
)

export const getPublicProductMetaBySlug = cached(
  async (slug: string) =>
    prisma.product.findUnique({
      where: { slug },
      select: {
        slug: true,
        name: true,
        tagline: true,
        description: true,
        logo: true,
        bannerImage: true,
        keywords: true,
        status: true,
        category: { select: { name: true, slug: true } },
        user: { select: { firstName: true, lastName: true } },
      },
      cacheStrategy: {
        ttl: DEFAULT_TTL.medium,
        swr: DEFAULT_SWR.medium,
        tags: accelerateTags([TAGS.products, TAGS.product(String(slug))]),
      },
    }),
  "product:meta-by-slug",
  {
    ttl: DEFAULT_TTL.medium,
    tags: ([slug]) => [TAGS.products, TAGS.product(String(slug))],
  },
)

export const getRelatedProductsByCategory = cached(
  async (categoryId: string, excludeId: string) =>
    prisma.product.findMany({
      where: { categoryId, NOT: { id: excludeId } },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { analytics: true },
      cacheStrategy: {
        ttl: DEFAULT_TTL.medium,
        swr: DEFAULT_SWR.medium,
        tags: accelerateTags([
          TAGS.products,
          TAGS.category(String(categoryId)),
        ]),
      },
    }),
  "products:related-by-category",
  {
    ttl: DEFAULT_TTL.medium,
    tags: ([categoryId]) => [TAGS.products, TAGS.category(String(categoryId))],
  },
)

export const getPublicProductsByUseCase = cached(
  async (useCaseSlug: string, excludeId: string) =>
    prisma.product.findMany({
      where: {
        id: { not: excludeId },
        status: "published",
        category: {
          useCases: {
            some: {
              useCase: {
                slug: useCaseSlug,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { analytics: true },
      cacheStrategy: {
        ttl: DEFAULT_TTL.medium,
        swr: DEFAULT_SWR.medium,
        tags: accelerateTags([
          TAGS.products,
          TAGS.category(String(useCaseSlug)),
        ]),
      },
    }),
  "products:public-by-usecase",
  {
    ttl: DEFAULT_TTL.medium,
    tags: ([useCaseSlug]) => [
      TAGS.products,
      TAGS.category(String(useCaseSlug)),
    ],
  },
)

export async function hasUserUpvoted(productId: string, clerkId: string) {
  const user = await getActiveUserByClerkId(clerkId)
  if (!user) return false
  const existing = await (prisma as any).productUpvote.findUnique({
    where: { productId_userId: { productId, userId: user.id } },
    select: { id: true },
  })
  return !!existing
}
