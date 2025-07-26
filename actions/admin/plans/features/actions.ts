"use server"

import prisma from "@/lib/prisma"

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

export async function getPlanFeatures() {
  try {
    return await prisma.planFeature.findMany({
      include: {
        assignments: {
          include: {
            plan: true,
          },
        },
      },
      orderBy: {
        key: "asc",
      },
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
