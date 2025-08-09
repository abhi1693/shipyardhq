"use server"

import prisma from "@/lib/prisma"
import { slugify } from "@/lib/utils"
import { Prisma } from "@prisma/client"

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

export async function getCategoryById(
  id: string,
  args: Omit<Prisma.CategoryFindUniqueArgs, "where"> = {},
) {
  try {
    return await prisma.category.findUnique({
      where: { id },
      ...args,
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
  const description = formData.get("description")?.toString() || ""

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
      data: { name: cleanName, slug, description },
    })
    return { success: true }
  } catch (error) {
    console.error("Error creating category:", error)
    return { error: "Failed to create category" }
  }
}

export async function updateCategoryAction(
  id: string,
  data: { name: string; description: string },
) {
  const name = data.name.trim()
  const slug = slugify(name)
  const description = data.description?.trim() || ""

  try {
    return await prisma.category.update({
      where: { id },
      data: { name, slug, description },
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

export async function getUseCases() {
  try {
    return await prisma.useCase.findMany({
      orderBy: { createdAt: "desc" },
    })
  } catch (error) {
    console.error("Error fetching use cases:", error)
    throw new Error("Failed to fetch use cases")
  }
}

export async function getUseCaseById(
  id: string,
  args: Omit<Prisma.UseCaseFindUniqueArgs, "where"> = {},
) {
  try {
    return await prisma.useCase.findUnique({
      where: { id },
      ...args,
    })
  } catch (error) {
    console.error("Error fetching use case by ID:", error)
    throw new Error("Failed to fetch use case")
  }
}

export async function deleteUseCaseAction(id: string) {
  try {
    const useCase = await prisma.useCase.findUnique({
      where: { id },
    })

    if (!useCase) {
      return { error: "Use case not found" }
    }

    await prisma.useCase.delete({
      where: { id },
    })

    return { success: true }
  } catch (error) {
    console.error("Error deleting use case:", error)
    return { error: "Failed to delete use case" }
  }
}

export async function updateUseCaseAction(id: string, data: { label: string }) {
  const label = data.label.trim()
  const slug = slugify(label)

  try {
    return await prisma.useCase.update({
      where: { id },
      data: { label, slug },
    })
  } catch (error) {
    console.error("Error updating use case:", error)
    return { error: "Failed to update use case" }
  }
}

export async function createUseCaseAction(formData: FormData) {
  const label = formData.get("label")

  if (typeof label !== "string" || label.trim() === "") {
    return { error: "Label is required" }
  }

  const cleanLabel = label.trim()
  const slug = slugify(cleanLabel)

  const exists = await prisma.useCase.findFirst({
    where: {
      OR: [{ label: cleanLabel }, { slug }],
    },
  })

  if (exists) {
    return { error: "Use case with this label or slug already exists" }
  }

  try {
    await prisma.useCase.create({
      data: { label: cleanLabel, slug },
    })
    return { success: true }
  } catch (error) {
    console.error("Error creating use case:", error)
    return { error: "Failed to create use case" }
  }
}

export async function getUseCaseAssignments() {
  try {
    return await prisma.useCaseCategory.findMany({
      include: {
        useCase: true,
        category: true,
      },
      orderBy: {
        useCase: {
          updatedAt: "desc",
        },
      },
    })
  } catch (error) {
    console.error("Error fetching use case assignments:", error)
    throw new Error("Failed to fetch use case assignments")
  }
}

export async function createUseCaseAssignmentAction(data: {
  useCaseId: string
  categoryId: string
}) {
  const { useCaseId, categoryId } = data

  if (!useCaseId || !categoryId) {
    return { error: "Use case and category are required" }
  }

  const existingAssignment = await prisma.useCaseCategory.findFirst({
    where: {
      useCaseId,
      categoryId,
    },
  })
  if (existingAssignment) {
    return { error: "Use case is already assigned to this category" }
  }

  try {
    await prisma.useCaseCategory.create({
      data: { useCaseId, categoryId },
    })
    return { success: true }
  } catch (error) {
    console.error("Error creating use case assignment:", error)
    return { error: "Failed to create use case assignment" }
  }
}

export async function deleteUseCaseAssignmentAction(data: {
  useCaseId: string
  categoryId: string
}) {
  const { useCaseId, categoryId } = data

  try {
    await prisma.useCaseCategory.delete({
      where: { useCaseId_categoryId: { useCaseId, categoryId } },
    })
    return { success: true }
  } catch (error) {
    console.error("Error deleting use case assignment:", error)
    return { error: "Failed to delete use case assignment" }
  }
}

export async function updateUseCaseAssignmentAction(
  prev: { useCaseId: string; categoryId: string },
  next: { useCaseId: string; categoryId: string },
) {
  try {
    // No changes
    if (
      prev.useCaseId === next.useCaseId && prev.categoryId === next.categoryId
    ) {
      return { success: true }
    }

    // Ensure target does not already exist
    const exists = await prisma.useCaseCategory.findUnique({
      where: {
        useCaseId_categoryId: {
          useCaseId: next.useCaseId,
          categoryId: next.categoryId,
        },
      },
    })
    if (exists) {
      return { error: "Assignment already exists for selection" }
    }

    await prisma.$transaction([
      prisma.useCaseCategory.create({ data: next }),
      prisma.useCaseCategory.delete({
        where: {
          useCaseId_categoryId: {
            useCaseId: prev.useCaseId,
            categoryId: prev.categoryId,
          },
        },
      }),
    ])

    return { success: true }
  } catch (error) {
    console.error("Error updating use case assignment:", error)
    return { error: "Failed to update use case assignment" }
  }
}
