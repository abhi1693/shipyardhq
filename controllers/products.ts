import prisma from "@/lib/prisma"

export async function getProducts(args = {}) {
  try {
    return await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      ...args,
    })
  } catch (error) {
    console.error("Error fetching products:", error)
    throw new Error("Failed to fetch products")
  }
}
