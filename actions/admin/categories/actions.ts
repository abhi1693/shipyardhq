"use server"

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

async function isExist(name: string, slug: string) {
  return prisma.category.findFirst({
    where: {
      OR: [{ name }, { slug }],
    },
  })
}

export async function createCategoryAction(formData: FormData) {
  const name = formData.get("name")

  if (typeof name !== "string" || name.trim() === "") {
    return { error: "Name is required" }
  }

  const cleanName = name.trim()
  const slug = slugify(cleanName)

  const exists = await isExist(cleanName, slug)
  if (exists) {
    return { error: "Category with this name or slug already exists" }
  }

  try {
    await prisma.category.create({
      data: { name: cleanName, slug },
    })
    return { success: true }
  } catch (error) {
    console.error("Error creating category:", error)
    return { error: "Failed to create category" }
  }
}

export async function updateCategoryAction(id: string, data: { name: string }) {
  const name = data.name.trim()
  const slug = slugify(name)

  try {
    return await prisma.category.update({
      where: { id },
      data: { name, slug },
    })
  } catch (error) {
    console.error("Error updating category:", error)
    return { error: "Failed to update category" }
  }
}

export async function deleteCategoryAction(id: string) {
  try {
    const category = await prisma.category.findUnique({
      where: { id },
    })

    if (!category) {
      return { error: "Category not found" }
    }

    await prisma.category.delete({
      where: { id },
    })

    return { success: true }
  } catch (error) {
    console.error("Error deleting category:", error)
    return { error: "Failed to delete category" }
  }
}
