"use server"

import prisma from "@/lib/prisma"

export async function getProducts(args = {}) {
  try {
    return await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        user: true,
      },
      ...args,
    })
  } catch (error) {
    console.error("Error fetching products:", error)
    throw new Error("Failed to fetch products")
  }
}

export async function getProductById(id: string) {
  try {
    return await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        user: true,
      },
    })
  } catch (error) {
    console.error("Error fetching product by ID:", error)
    throw new Error("Failed to fetch product")
  }
}

export async function createProductAction(formData: FormData) {
  const name = formData.get("name")
  const description = formData.get("description")
  const categoryId = formData.get("categoryId")
  const userId = formData.get("userId")

  if (
    typeof name !== "string" ||
    typeof categoryId !== "string" ||
    typeof userId !== "string" ||
    name.trim() === ""
  ) {
    return { error: "Name, Category and User are required" }
  }

  try {
    await prisma.product.create({
      data: {
        name: name.trim(),
        description:
          typeof description === "string" ? description.trim() : null,
        categoryId,
        userId,
      },
    })
    return { success: true }
  } catch (error) {
    console.error("Error creating product:", error)
    return { error: "Failed to create product" }
  }
}

export async function updateProductAction(
  id: string,
  data: {
    name: string
    description?: string | null
    categoryId: string
    userId: string
  },
) {
  const { name, description, categoryId, userId } = data

  try {
    return await prisma.product.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        categoryId,
        userId,
      },
    })
  } catch (error) {
    console.error("Error updating product:", error)
    return { error: "Failed to update product" }
  }
}

export async function deleteProductAction(id: string) {
  try {
    return await prisma.product.delete({
      where: { id },
    })
  } catch (error) {
    console.error("Error deleting product:", error)
    return { error: "Failed to delete product" }
  }
}
