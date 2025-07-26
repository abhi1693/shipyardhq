"use server"

import prisma from "@/lib/prisma"
import { Prisma, PlanType } from "@prisma/client"

// Get all plans
export async function getPlans(args: Prisma.PlanFindManyArgs = {}) {
  try {
    return await prisma.plan.findMany({
      orderBy: { price: "asc" },
      ...args,
    })
  } catch (error) {
    console.error("Failed to fetch plans:", error)
    throw new Error("Unable to load plans.")
  }
}

// Check if plan with the given slug already exists
export async function planSlugExists(slug: string) {
  return prisma.plan.findUnique({
    where: { slug },
    select: { id: true },
  })
}

export async function createPlanAction(formData: FormData) {
  const name = formData.get("name")!.toString().trim()
  const slug = formData.get("slug")!.toString().trim()
  const description = formData.get("description")?.toString().trim() || null
  const type = formData.get("type") as PlanType
  const price = parseInt(formData.get("price")!.toString(), 10)
  const interval = formData.get("interval")!.toString()
  const frequency = parseInt(formData.get("frequency")!.toString(), 10)
  const discountRaw = formData.get("discount")
  const trialDaysRaw = formData.get("trialDays")
  const isDefault =
    formData.get("isDefault") === "true" || formData.get("isDefault") === "on"

  const discount = discountRaw ? parseInt(discountRaw.toString(), 10) : null
  const trialDays = trialDaysRaw ? parseInt(trialDaysRaw.toString(), 10) : null

  try {
    const exists = await planSlugExists(slug)
    if (exists) {
      return { error: "A plan with this slug already exists." }
    }

    await prisma.plan.create({
      data: {
        name,
        slug,
        description,
        type,
        price,
        interval,
        frequency,
        discount,
        trialDays,
        isDefault,
      },
    })

    return { success: true }
  } catch (error) {
    console.error("❌ Failed to create plan:", error)
    return { error: "Failed to create plan." }
  }
}

// Get a single plan by ID
export async function getPlanById(
  id: string,
  args: Omit<Prisma.PlanFindUniqueArgs, "where"> = {},
) {
  try {
    return await prisma.plan.findUnique({
      where: { id },
      ...args,
    })
  } catch (error) {
    console.error("Failed to fetch plan by ID:", error)
    throw new Error("Unable to load plan.")
  }
}

// Delete a plan by ID
export async function deletePlanAction(id: string) {
  try {
    await prisma.plan.delete({
      where: { id },
    })
    return { success: true }
  } catch (error) {
    console.error("❌ Failed to delete plan:", error)
    return {
      error: "Failed to delete plan. It may be linked to other records.",
    }
  }
}
