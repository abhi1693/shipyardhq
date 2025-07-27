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

export async function assignBadgeToProduct(data: {
  productId: string
  badgeId: string
  expiresAt?: Date
}) {
  return prisma.productBadge.create({
    data,
  })
}

export async function removeBadgeFromProduct(
  productId: string,
  badgeId: string,
) {
  return prisma.productBadge.delete({
    where: {
      productId_badgeId: {
        productId,
        badgeId,
      },
    },
  })
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
