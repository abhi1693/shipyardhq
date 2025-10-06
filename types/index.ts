import { Icons } from "@/components/icons"
import {
  Category,
  PlacementStatus,
  Prisma,
  UseCase,
} from "@/lib/vendor/prisma/client"

export interface NavItem {
  title: string
  url: string
  disabled?: boolean
  icon?: keyof typeof Icons
  label?: string
  description?: string
  isActive?: boolean
  items?: NavItem[]
}

export const featuredProductSelect = {
  id: true,
  badge: true,
  expiresAt: true,
  createdAt: true,
  productId: true,
  product: {
    select: {
      id: true,
      slug: true,
      name: true,
      logo: true,
      tagline: true,
      bannerImage: true,
      analytics: { select: { upvotes: true } },
      user: { select: { firstName: true, lastName: true } },
      category: { select: { name: true } },
      ProductBadge: {
        select: {
          id: true,
          badge: true,
          expiresAt: true,
        },
      },
      featureEntitlements: {
        where: {
          status: { in: ["active", "pending"] },
        },
        select: {
          id: true,
          featureKey: true,
          status: true,
          expiresAt: true,
        },
      },
      plan: {
        select: {
          assignments: {
            where: { enabled: true },
            select: {
              feature: {
                select: {
                  key: true,
                },
              },
            },
          },
        },
      },
      placementSchedules: {
        where: {
          status: PlacementStatus.active,
        },
        select: {
          id: true,
          featureKey: true,
          startsAt: true,
          endsAt: true,
        },
      },
    },
  },
} satisfies Prisma.ProductBadgeSelect

export type FeaturedProduct = Prisma.ProductBadgeGetPayload<{
  select: typeof featuredProductSelect
}>

export interface BrowseFiltersProps {
  useCases: UseCase[]
  categories: Category[]
  current: {
    useCase?: string
    category?: string
    verified?: boolean
    sort?: string
  }
}
