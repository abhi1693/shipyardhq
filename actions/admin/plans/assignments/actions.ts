"use server"

import prisma from "@/lib/prisma"

export async function getAssignedFeatures() {
  return prisma.planFeatureAssignment.findMany({
    include: {
      plan: { select: { id: true, name: true } },
      feature: { select: { id: true, name: true, key: true } },
    },
    orderBy: {
      createdAt: "desc",
    },
  })
}
