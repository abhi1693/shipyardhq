"use server"

import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

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
