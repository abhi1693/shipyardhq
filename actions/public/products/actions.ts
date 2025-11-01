import prisma from "@/lib/prisma"
import { Prisma } from "@/lib/vendor/prisma/client"
import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { getActiveUserByClerkId } from "@/lib/server/userStatus"
import { resolveVoteState } from "@/lib/server/productVotesStore"

type PublicProduct = Prisma.ProductGetPayload<{
  include: {
    category: {
      include: {
        useCases: {
          include: { useCase: true }
        }
      }
    }
    alternatives: {
      orderBy: { name: "asc" }
      select: {
        id: true
        slug: true
        name: true
        websiteUrl: true
        logoUrl: true
      }
    }
    user: {
      select: {
        id: true
        firstName: true
        lastName: true
        email: true
        role: true
      }
    }
    metadata: true
    analytics: true
    verification: true
    ProductMedia: {
      orderBy: {
        createdAt: "asc"
      }
    }
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
    featureEntitlements: {
      where: {
        status: { in: ["active", "pending"] }
      }
      select: { featureKey: true }
    }
  }
}>

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
      alternatives: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          slug: true,
          name: true,
          websiteUrl: true,
          logoUrl: true,
        },
      },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
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
      featureEntitlements: {
        where: {
          status: { in: ["active", "pending"] },
        },
        select: { featureKey: true },
      },
    },
  })

  if (!product) return null

  const fullProduct = product as PublicProduct

  const activeBadges = fullProduct.ProductBadge.filter(
    (badge: PublicProduct["ProductBadge"][number]) =>
      !badge.expiresAt || badge.expiresAt > new Date(),
  ).map((badge) => badge.badge)

  const activeFeatureEntitlements = (fullProduct.featureEntitlements ?? []).map(
    (ent) => ent.featureKey,
  )

  const { featureEntitlements: _featureEntitlements, ...rest } = fullProduct
  void _featureEntitlements

  return {
    ...rest,
    badges: activeBadges,
    activeFeatureEntitlements,
  }
}

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
        id: true,
        slug: true,
        name: true,
        tagline: true,
        description: true,
        publishedAt: true,
        createdAt: true,
        logo: true,
        bannerImage: true,
        keywords: true,
        status: true,
        type: true,
        pricingModel: true,
        platforms: true,
        websiteUrl: true,
        ctaLabel: true,
        ctaUrl: true,
        category: { select: { name: true, slug: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
        analytics: { select: { upvotes: true } },
        metadata: { select: { demoUrl: true, utmCampaign: true } },
        ProductMedia: {
          select: {
            id: true,
            imageUrl: true,
            altText: true,
          },
          orderBy: { createdAt: "asc" },
        },
        plan: {
          select: {
            assignments: {
              select: {
                enabled: true,
                feature: { select: { key: true } },
              },
            },
          },
        },
        featureEntitlements: {
          where: { status: { in: ["active", "pending"] } },
          select: { featureKey: true },
        },
      },
    }),
  "product:meta-by-slug",
  {
    ttl: DEFAULT_TTL.medium,
    tags: ([slug]) => [TAGS.products, TAGS.product(String(slug))],
  },
)

const compactProductInclude = {
  analytics: true,
  category: {
    select: {
      name: true,
      slug: true,
    },
  },
} satisfies Prisma.ProductInclude

type CompactProduct = Prisma.ProductGetPayload<{
  include: typeof compactProductInclude
}>

export const getPublicProductsByUseCase = cached(
  async (
    useCaseSlug: string,
    excludeId: string,
    limit = 6,
  ): Promise<CompactProduct[]> => {
    const effectiveLimit = Math.max(1, Math.min(limit, 12))

    const randomProductIds = await prisma.$queryRaw<{ id: string }[]>`
      SELECT p.id
      FROM "Product" AS p
      INNER JOIN "Category" AS c ON c.id = p."categoryId"
      INNER JOIN "UseCaseCategory" AS uc ON uc."categoryId" = c.id
      INNER JOIN "UseCase" AS u ON u.id = uc."useCaseId"
      WHERE u.slug = ${useCaseSlug}
        AND p.status = 'published'
        AND p.id <> ${excludeId}
      ORDER BY RANDOM()
      LIMIT ${effectiveLimit}
    `

    if (!randomProductIds.length) {
      return []
    }

    return prisma.product.findMany({
      where: {
        id: {
          in: randomProductIds.map(({ id }) => id),
        },
      },
      include: compactProductInclude,
    })
  },
  "products:public-by-usecase",
  {
    ttl: DEFAULT_TTL.medium,
    tags: ([useCaseSlug]) => [
      TAGS.products,
      TAGS.category(String(useCaseSlug)),
    ],
    keyParts: ([useCaseSlug, excludeId, limit]) => [
      `useCase:${useCaseSlug}`,
      `exclude:${excludeId}`,
      `limit:${limit ?? 6}`,
    ],
  },
)

export async function hasUserUpvoted(productId: string, clerkId: string) {
  const user = await getActiveUserByClerkId(clerkId)
  if (!user) return false
  const { currentState } = await resolveVoteState(productId, user.id)
  return currentState === "upvoted"
}
