"use server"

import prisma from "@/lib/prisma"
import { dispatchEvent } from "@/lib/server/events"
import "@/lib/server/badges" // ensure listeners are registered
import "@/lib/server/social/twitterBot"
import {
  revalidateBadges,
  revalidateProduct,
  revalidateProducts,
} from "@/lib/cache/revalidate"
import { Prisma } from "@/lib/vendor/prisma/client"

export async function getAllAssignedBadges(
  args: Prisma.ProductBadgeFindManyArgs = {},
) {
  try {
    const { select, include, orderBy, ...rest } = args
    const fallbackOrderBy = orderBy ?? { createdAt: "desc" }

    if (select) {
      return await prisma.productBadge.findMany({
        select,
        orderBy: fallbackOrderBy,
        ...rest,
      })
    }

    return await prisma.productBadge.findMany({
      include: include ?? {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: fallbackOrderBy,
      ...rest,
    })
  } catch (error) {
    console.error("Error fetching product badge assignments:", error)
    throw new Error("Failed to fetch product badge assignments")
  }
}

export async function getAllAssignedBadgesCount(
  args: Prisma.ProductBadgeCountArgs = {},
) {
  try {
    return await prisma.productBadge.count(args)
  } catch (error) {
    console.error("Error counting product badge assignments:", error)
    throw new Error("Failed to count product badge assignments")
  }
}

export async function assignBadgeToProduct(data: {
  productId: string
  badge: string
  expiresAt?: Date
}) {
  const { productId, badge, expiresAt } = data

  const existing = await prisma.productBadge.findFirst({
    where: {
      productId,
      badge,
    },
  })

  if (existing) {
    throw new Error("This badge is already assigned to the product.")
  }

  const created = await prisma.productBadge.create({
    data: {
      productId,
      badge,
      expiresAt,
    },
  })

  // Publish badge assignment event so listeners can enforce defaults
  void dispatchEvent("badge.assigned", {
    id: created.id,
    productId,
    badge,
    expiresAt: created.expiresAt ?? undefined,
  }).catch((error) => {
    console.error("[badges] failed to dispatch badge.assigned event", {
      productId,
      badge,
      error,
    })
  })

  // Invalidate caches for product badge-related sections
  revalidateProduct(productId)
  revalidateBadges()
  revalidateProducts()

  return created
}

export async function getBadgeAssignmentById(id: string) {
  return prisma.productBadge.findUnique({
    where: { id },
    include: {
      product: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })
}

export async function deleteProductBadgeAction(id: string) {
  try {
    // Grab info before deleting for event payload
    const existing = await prisma.productBadge.findUnique({
      where: { id },
      select: { id: true, productId: true, badge: true },
    })
    const result = await prisma.productBadge.delete({ where: { id } })
    if (existing) {
      void dispatchEvent("badge.removed", existing).catch((error) => {
        console.error("[badges] failed to dispatch badge.removed event", {
          badgeId: existing.id,
          productId: existing.productId,
          error,
        })
      })
    }
    if (existing?.productId) {
      revalidateProduct(existing.productId)
      revalidateBadges()
      revalidateProducts()
    }
    return result
  } catch (error) {
    console.error("Error deleting product badge:", error)
    return { error: "Failed to delete product badge" }
  }
}
