"use server"

import prisma from "@/lib/prisma"

export async function getBadges() {
  return prisma.badge.findMany({
    orderBy: { createdAt: "desc" },
  })
}

export async function getBadgeById(id: string) {
  return prisma.badge.findUnique({
    where: { id },
  })
}

export async function createBadge(data: {
  name: string
  slug: string
  color: string
  description?: string
  icon?: string
}) {
  const exists = await badgeSlugExists(data.slug)
  if (exists) throw new Error("A badge with this slug already exists")
  return prisma.badge.create({ data })
}

export async function updateBadge(
  id: string,
  data: Partial<{
    name: string
    slug: string
    color: string
    description?: string
    icon?: string
  }>,
) {
  if (data.slug) {
    const exists = await badgeSlugExists(data.slug, id)
    if (exists) throw new Error("A badge with this slug already exists")
  }
  return prisma.badge.update({
    where: { id },
    data,
  })
}

export async function deleteBadge(id: string) {
  return prisma.badge.delete({ where: { id } })
}

export async function badgeSlugExists(slug: string, excludeId?: string) {
  const existing = await prisma.badge.findFirst({
    where: {
      slug,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  })
  return !!existing
}

export async function getAllAssignedBadges() {
  return prisma.productBadge.findMany({
    include: {
      badge: true,
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
  badgeId: string
  expiresAt?: Date
}) {
  const { productId, badgeId, expiresAt } = data

  // check if already assigned
  const existing = await prisma.productBadge.findUnique({
    where: {
      productId_badgeId: {
        productId,
        badgeId,
      },
    },
  })

  if (existing) {
    throw new Error("This badge is already assigned to the product.")
  }

  return prisma.productBadge.create({
    data: {
      productId,
      badgeId,
      expiresAt,
    },
  })
}

export async function getBadgeAssignmentById(id: string) {
  return prisma.productBadge.findUnique({
    where: { id },
    include: {
      badge: true,
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
