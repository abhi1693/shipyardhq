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

type Input = {
  planId: string
  featureId: string
  enabled?: boolean
  isExperimental?: boolean
}

export async function createPlanFeatureAssignment(data: Input) {
  try {
    const exists = await prisma.planFeatureAssignment.findUnique({
      where: {
        planId_featureId: {
          planId: data.planId,
          featureId: data.featureId,
        },
      },
    })

    if (exists) {
      return { error: "This feature is already assigned to this plan." }
    }

    await prisma.planFeatureAssignment.create({
      data: {
        planId: data.planId,
        featureId: data.featureId,
        enabled: data.enabled ?? false,
        isExperimental: data.isExperimental ?? false,
      },
    })

    return { success: true }
  } catch (error) {
    console.error("❌ Failed to assign feature:", error)
    return { error: "Failed to assign feature to plan." }
  }
}
