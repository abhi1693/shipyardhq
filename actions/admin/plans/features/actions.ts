"use server"

import prisma from "@/lib/prisma"
import { Prisma } from "@/lib/vendor/prisma/client"
import { PLAN_FEATURE_KEYS } from "@/lib/constants"
import { revalidatePlanFeature, revalidatePlans } from "@/lib/cache/revalidate"

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
    if (!PLAN_FEATURE_KEYS.includes(key as any)) {
      return { error: "Invalid feature key." }
    }
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

    revalidatePlanFeature(key, "revalidate")
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
    const updated = await prisma.planFeature.update({
      where: { id },
      data,
      select: { key: true },
    })
    revalidatePlanFeature(updated.key, "revalidate")
    return { success: true }
  } catch (error) {
    console.error("Failed to update plan feature:", error)
    return { error: "Failed to update plan feature." }
  }
}

export async function deletePlanFeatureAction(id: string) {
  try {
    const existing = await prisma.planFeature.findUnique({
      where: { id },
      select: { key: true },
    })
    await prisma.planFeature.delete({
      where: { id },
    })
    if (existing?.key) {
      revalidatePlanFeature(existing.key, "revalidate")
    } else {
      revalidatePlans("revalidate")
    }
    return { success: true }
  } catch (error) {
    console.error("Failed to delete plan feature:", error)
    return { error: "Failed to delete plan feature." }
  }
}

export async function getPlanFeatures(
  args: Prisma.PlanFeatureFindManyArgs = {},
) {
  try {
    const { select, include, orderBy, ...rest } = args
    const fallbackOrderBy = orderBy ?? { createdAt: "desc" }

    if (select) {
      return await prisma.planFeature.findMany({
        select,
        orderBy: fallbackOrderBy,
        ...rest,
      })
    }

    return await prisma.planFeature.findMany({
      include: include ?? {
        assignments: {
          include: {
            plan: true,
          },
        },
      },
      orderBy: fallbackOrderBy,
      ...rest,
    })
  } catch (error) {
    console.error("Failed to fetch plan features:", error)
    throw new Error("Unable to load plan features.")
  }
}

export async function getPlanFeaturesCount(
  args: Prisma.PlanFeatureCountArgs = {},
) {
  try {
    return await prisma.planFeature.count(args)
  } catch (error) {
    console.error("Failed to count plan features:", error)
    throw new Error("Unable to count plan features.")
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
