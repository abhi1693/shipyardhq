import { Icons } from "@/components/icons"
import { Prisma } from "@prisma/client"

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

export type FeaturedProduct = Prisma.ProductBadgeGetPayload<{
  include: {
    product: {
      include: {
        metadata: true
        category: true
        analytics: true
        user: true
        ProductBadge: true
      }
    }
  }
}>
