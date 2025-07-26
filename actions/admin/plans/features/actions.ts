"use server"

import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export async function existsPlanFeature(key: string) {
  return prisma.planFeature.findUnique({
    where: { key },
  })
}

export async function createPlanFeatureAction(formData: FormData) {
  const key = formData.get("key")!.toString().trim()
  const name = formData.get("name")!.toString().trim()
  const description = formData.get("description")!.toString().trim()

  try {
    const existing = await existsPlanFeature(key)
    if (existing) {
      return { error: "Feature key already exists." }
    }

    await prisma.planFeature.create({
      data: {
        key,
        name,
        description,
      },
    })

    return { success: true }
  } catch (error) {
    console.error("Failed to create plan feature:", error)
    return { error: "Failed to create plan feature." }
  }
}

export async function updatePlanFeatureAction(
  id: string,
  data: {
    name: string
    description: string
  },
) {
  try {
    await prisma.planFeature.update({
      where: { id },
      data,
    })
    return { success: true }
  } catch (error) {
    console.error("Failed to update plan feature:", error)
    return { error: "Failed to update plan feature." }
  }
}

export async function deletePlanFeatureAction(id: string) {
  try {
    await prisma.planFeature.delete({
      where: { id },
    })
    return { success: true }
  } catch (error) {
    console.error("Failed to delete plan feature:", error)
    return { error: "Failed to delete plan feature." }
  }
}

export async function getPlanFeatures(
  args: {
    select?: Prisma.PlanFeatureSelect
    where?: Prisma.PlanFeatureWhereInput
    orderBy?: Prisma.PlanFeatureOrderByWithRelationInput
    includeAssignments?: boolean
  } = {},
) {
  const { select, where, orderBy, includeAssignments = true } = args

  try {
    if (select) {
      // Use select version (no include allowed)
      return await prisma.planFeature.findMany({
        select,
        where,
        orderBy,
      })
    }

    // Use include version
    return await prisma.planFeature.findMany({
      where,
      orderBy,
      include: includeAssignments
        ? {
            assignments: {
              include: {
                plan: true,
              },
            },
          }
        : undefined,
    })
  } catch (error) {
    console.error("Failed to fetch plan features:", error)
    throw new Error("Unable to load plan features.")
  }
}

export async function getPlanFeatureById(id: string) {
  try {
    return await prisma.planFeature.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            plan: true,
          },
        },
      },
    })
  } catch (error) {
    console.error("Failed to fetch plan feature by ID:", error)
    throw new Error("Unable to load plan feature.")
  }
}
