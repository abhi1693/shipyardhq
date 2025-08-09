import { Icons } from "@/components/icons"
import { Category, Prisma, UseCase } from "@prisma/client"

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
