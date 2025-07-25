import prisma from "@/lib/prisma"
import { CategoryFindManySchema } from "@/prisma/generated/schemas"
import { treeifyError } from "zod"

export async function getCategories(args: unknown = {}) {
  const parsed = CategoryFindManySchema.safeParse(args)

  if (!parsed.success) {
    console.error(
      "Validation error in getCategories:",
      treeifyError(parsed.error),
    )
    throw new Error("Invalid query arguments for fetching categories")
  }

  try {
    return await prisma.category.findMany({
      orderBy: { createdAt: "desc" },
      ...parsed.data,
    })
  } catch (error) {
    console.error("Error fetching categories:", error)
    throw new Error("Failed to fetch categories")
  }
}
