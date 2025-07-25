import prisma from "@/lib/prisma"
import { slugify } from "@/lib/utils"

export async function getCategories(args = {}) {
  try {
    return await prisma.category.findMany({
      orderBy: { createdAt: "desc" },
      ...args,
    })
  } catch (error) {
    console.error("Error fetching categories:", error)
    throw new Error("Failed to fetch categories")
  }
}

export async function isExist(name: string, slug: string) {
  return prisma.category.findFirst({
    where: {
      OR: [{ name }, { slug }],
    },
  })
}

export async function createCategory(data: { name: string }) {
  const name = data.name.trim()
  const slug = slugify(name)

  const exists = await isExist(name, slug)
  if (exists) {
    return { error: "Category with this name or slug already exists" }
  }

  try {
    return await prisma.category.create({
      data: { name, slug },
    })
  } catch (error) {
    console.error("Error creating category:", error)
    return { error: "Failed to create category" }
  }
}

export async function getCategoryById(id: string) {
  try {
    return await prisma.category.findUnique({
      where: { id },
    })
  } catch (error) {
    console.error("Error fetching category by ID:", error)
    throw new Error("Failed to fetch category")
  }
}

export async function deleteCategory(id: string) {
  try {
    return await prisma.category.delete({
      where: { id },
    })
  } catch (error) {
    console.error("Error deleting category:", error)
    return { error: "Failed to delete category" }
  }
}
