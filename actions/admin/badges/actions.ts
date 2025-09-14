"use server"

import prisma from "@/lib/prisma"
import { publish } from "@/lib/server/events"
import "@/lib/server/badges" // ensure listeners are registered
import {
  revalidateBadges,
  revalidateProduct,
  revalidateProducts,
} from "@/lib/cache/revalidate"

export async function getAllAssignedBadges() {
  return prisma.productBadge.findMany({
    include: {
      product: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })
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
  await publish("badge.assigned", {
    id: created.id,
    productId,
    badge,
    expiresAt: created.expiresAt ?? undefined,
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
      await publish("badge.removed", existing)
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
