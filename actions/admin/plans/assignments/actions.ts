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

type UpdateAssignmentInput = {
  planId: string
  featureId: string
  enabled?: boolean
  isExperimental?: boolean
}

export async function updatePlanFeatureAssignmentAction(
  id: string,
  input: UpdateAssignmentInput,
) {
  try {
    // Check for duplicate (other than self)
    const exists = await prisma.planFeatureAssignment.findFirst({
      where: {
        planId: input.planId,
        featureId: input.featureId,
        NOT: { id },
      },
      select: { id: true },
    })

    if (exists) {
      return {
        error: "This feature is already assigned to the selected plan.",
      }
    }

    await prisma.planFeatureAssignment.update({
      where: { id },
      data: {
        planId: input.planId,
        featureId: input.featureId,
        enabled: input.enabled ?? false,
        isExperimental: input.isExperimental ?? false,
      },
    })

    return { success: true }
  } catch (error) {
    console.error("❌ Failed to update assignment:", error)
    return { error: "Failed to update assignment." }
  }
}

export async function deletePlanFeatureAssignmentAction(id: string) {
  try {
    await prisma.planFeatureAssignment.delete({
      where: { id },
    })
    return { success: true }
  } catch (error) {
    console.error("❌ Failed to delete plan-feature assignment:", error)
    return { error: "Failed to delete assigned feature." }
  }
}
