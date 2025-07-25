"use server"

import prisma from "@/lib/prisma"

function generateVerificationTxt(): string {
  return `prod-verif-shipyard-${Math.random().toString(36).slice(2, 10)}`
}

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
  const name = formData.get("name")!.toString().trim()
  const tagline = formData.get("tagline")!.toString().trim()
  const websiteUrl = formData.get("websiteUrl")!.toString().trim()
  const logo = formData.get("logo")!.toString().trim()
  const categoryId = formData.get("categoryId")!.toString()
  const userId = formData.get("userId")!.toString()

  const githubUrl = formData.get("githubUrl")?.toString().trim()
  const twitterUrl = formData.get("twitterUrl")?.toString().trim()
  const demoUrl = formData.get("demoUrl")?.toString().trim()
  const contactEmail = formData.get("contactEmail")?.toString().trim()

  try {
    await prisma.product.create({
      data: {
        name,
        tagline,
        websiteUrl,
        logo,
        categoryId,
        userId,
        metadata: {
          create: {
            githubUrl,
            twitterUrl,
            demoUrl,
            contactEmail,
          },
        },
        analytics: {
          create: {},
        },
        verification: {
          create: {
            verificationTxt: generateVerificationTxt(),
          },
        },
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
    categoryId: string
    userId: string
  },
) {
  const { name, categoryId, userId } = data

  try {
    return await prisma.product.update({
      where: { id },
      data: {
        name: name.trim(),
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
