import prisma from "@/lib/prisma"
import { ProductFindManySchema } from "@/prisma/generated/schemas"
import { treeifyError } from "zod"

export async function getProducts(args: unknown = {}) {
  const parsed = ProductFindManySchema.safeParse(args)

  if (!parsed.success) {
    console.error(
      "Validation error in getProducts:",
      treeifyError(parsed.error),
    )
    throw new Error("Invalid query arguments for fetching products")
  }

  try {
    return await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      ...parsed.data,
    })
  } catch (error) {
    console.error("Error fetching products:", error)
    throw new Error("Failed to fetch products")
  }
}
