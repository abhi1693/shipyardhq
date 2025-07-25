import prisma from "@/lib/prisma"

export async function getCategories() {
  try {
    return await prisma.category.findMany({
      orderBy: {
        createdAt: "desc",
      },
    })
  } catch (error) {
    console.error("Error fetching categories:", error)
    throw new Error("Failed to fetch categories")
  }
}
