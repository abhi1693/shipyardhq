import prisma from "@/lib/prisma"
import { Prisma } from "@/lib/vendor/prisma/client"
import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { getActiveUserByClerkId } from "@/lib/server/userStatus"

async function fetchPublicProduct(where: Prisma.ProductWhereUniqueInput) {
  const product = await prisma.product.findUnique({
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
  })

  if (!product) return null

  const activeBadges = product.ProductBadge.filter(
    (b) => !b.expiresAt || b.expiresAt > new Date(),
  ).map((b) => b.badge)

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
    }),
  "products:related-by-category",
  {
    ttl: DEFAULT_TTL.medium,
    tags: ([categoryId]) => [TAGS.products, TAGS.category(String(categoryId))],
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
