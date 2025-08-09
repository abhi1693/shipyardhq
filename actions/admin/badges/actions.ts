"use server"

import prisma from "@/lib/prisma"

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

  return prisma.productBadge.create({
    data: {
      productId,
      badge,
      expiresAt,
    },
  })
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
    return prisma.productBadge.delete({ where: { id } })
  } catch (error) {
    console.error("Error deleting product badge:", error)
    return { error: "Failed to delete product badge" }
  }
}
