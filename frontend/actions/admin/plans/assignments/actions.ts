"use server"

import prisma from "@/lib/prisma"
import { Prisma, TimeInterval } from "@/lib/vendor/prisma/client"

export async function getAssignedFeatures(
  args: Prisma.PlanFeatureAssignmentFindManyArgs = {},
) {
  const { select, include, orderBy, ...rest } = args
  const fallbackOrderBy = orderBy ?? { createdAt: "desc" }

  try {
    if (select) {
      return await prisma.planFeatureAssignment.findMany({
        select,
        orderBy: fallbackOrderBy,
        ...rest,
      })
    }

    return await prisma.planFeatureAssignment.findMany({
      include: include ?? {
        plan: { select: { id: true, name: true } },
        feature: { select: { id: true, name: true, key: true } },
      },
      orderBy: fallbackOrderBy,
      ...rest,
    })
  } catch (error) {
    console.error("Failed to fetch plan feature assignments:", error)
    throw new Error("Unable to load plan feature assignments.")
  }
}

export async function getAssignedFeaturesCount(
  args: Prisma.PlanFeatureAssignmentCountArgs = {},
) {
  try {
    return await prisma.planFeatureAssignment.count(args)
  } catch (error) {
    console.error("Failed to count plan feature assignments:", error)
    throw new Error("Unable to count plan feature assignments.")
  }
}

type Input = {
  planId: string
  featureId: string
  enabled?: boolean
  isExperimental?: boolean
  usageLimit?: number | null
  usageInterval?: TimeInterval | null
}

export async function createPlanFeatureAssignment(data: Input) {
  try {
    const feature = await prisma.planFeature.findUnique({
      where: { id: data.featureId },
      select: { key: true },
    })

    if (!feature) {
      return { error: "Selected feature does not exist." }
    }

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

    const configJson =
      data.usageLimit != null && data.usageInterval
        ? {
            usageLimit: data.usageLimit,
            usageInterval: data.usageInterval,
          }
        : Prisma.JsonNull

    await prisma.planFeatureAssignment.create({
      data: {
        planId: data.planId,
        featureId: data.featureId,
        enabled: data.enabled ?? false,
        isExperimental: data.isExperimental ?? false,
        config: configJson,
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
  usageLimit?: number | null
  usageInterval?: TimeInterval | null
}

export async function updatePlanFeatureAssignmentAction(
  id: string,
  input: UpdateAssignmentInput,
) {
  try {
    const feature = await prisma.planFeature.findUnique({
      where: { id: input.featureId },
      select: { key: true },
    })

    if (!feature) {
      return {
        error: "Selected feature does not exist.",
      }
    }

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

    const configJson =
      input.usageLimit != null && input.usageInterval
        ? {
            usageLimit: input.usageLimit,
            usageInterval: input.usageInterval,
          }
        : Prisma.JsonNull

    await prisma.planFeatureAssignment.update({
      where: { id },
      data: {
        planId: input.planId,
        featureId: input.featureId,
        enabled: input.enabled ?? false,
        isExperimental: input.isExperimental ?? false,
        config: configJson,
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
