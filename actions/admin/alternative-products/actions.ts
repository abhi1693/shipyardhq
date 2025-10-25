"use server"

import prisma from "@/lib/prisma"
import { Prisma } from "@/lib/vendor/prisma/client"
import {
  revalidateAlternativeProduct,
  revalidateProduct,
} from "@/lib/cache/revalidate"

export async function getAlternativeProducts(
  args: Prisma.AlternativeProductFindManyArgs = {},
) {
  try {
    const query: Prisma.AlternativeProductFindManyArgs = {
      orderBy: { createdAt: "desc" },
      ...(args.include || args.select
        ? {}
        : {
            include: {
              categories: true,
              _count: {
                select: { products: true },
              },
            },
          }),
      ...args,
    }

    return await prisma.alternativeProduct.findMany(query)
  } catch (error) {
    console.error("Error fetching alternative products:", error)
    throw new Error("Failed to fetch alternative products")
  }
}

export async function getAlternativeProductsCount(
  args: Prisma.AlternativeProductCountArgs = {},
) {
  try {
    return await prisma.alternativeProduct.count(args)
  } catch (error) {
    console.error("Error counting alternative products:", error)
    throw new Error("Failed to count alternative products")
  }
}

export async function getAlternativeProductById(
  id: string,
  args: Omit<Prisma.AlternativeProductFindUniqueArgs, "where"> = {},
) {
  try {
    return await prisma.alternativeProduct.findUnique({
      where: { id },
      include: {
        categories: true,
        products: {
          include: {
            category: true,
          },
        },
      },
      ...args,
    })
  } catch (error) {
    console.error("Error fetching alternative product by ID:", error)
    throw new Error("Failed to fetch alternative product")
  }
}

export async function createAlternativeProductAction(formData: FormData) {
  const name = formData.get("name")?.toString().trim() ?? ""
  const description = formData.get("description")?.toString().trim() ?? ""
  const websiteUrl = formData.get("websiteUrl")?.toString().trim() ?? ""
  const logoUrl = formData.get("logoUrl")?.toString().trim() ?? ""

  if (!name) {
    return { error: "Name is required" }
  }
  if (!description) {
    return { error: "Description is required" }
  }
  if (!websiteUrl) {
    return { error: "Website URL is required" }
  }
  if (!logoUrl) {
    return { error: "Logo URL is required" }
  }

  try {
    // Validate URL format early
    new URL(websiteUrl)
  } catch {
    return { error: "Website URL must be a valid URL" }
  }

  const categoryIds = formData
    .getAll("categoryIds")
    .map((value) => value.toString())
    .filter(Boolean)
  const productIds = formData
    .getAll("productIds")
    .map((value) => value.toString())
    .filter(Boolean)

  try {
    const existing = await prisma.alternativeProduct.findFirst({
      where: { websiteUrl },
      select: { id: true },
    })
    if (existing) {
      return { error: "An alternative with this website URL already exists" }
    }

    const created = await prisma.alternativeProduct.create({
      data: {
        name,
        description,
        websiteUrl,
        logoUrl,
        categories: categoryIds.length
          ? {
              connect: categoryIds.map((id) => ({ id })),
            }
          : undefined,
        products: productIds.length
          ? {
              connect: productIds.map((id) => ({ id })),
            }
          : undefined,
      },
    })

    revalidateAlternativeProduct(created.id)
    productIds.forEach((productId) => {
      revalidateProduct(productId)
    })

    return { success: true, id: created.id }
  } catch (error) {
    console.error("Error creating alternative product:", error)
    return { error: "Failed to create alternative product" }
  }
}

export async function updateAlternativeProductAction(
  id: string,
  data: {
    name: string
    description: string
    websiteUrl: string
    logoUrl: string
    categoryIds: string[]
    productIds: string[]
  },
) {
  const name = data.name.trim()
  const description = data.description.trim()
  const websiteUrl = data.websiteUrl.trim()
  const logoUrl = data.logoUrl.trim()

  if (!name) {
    return { error: "Name is required" }
  }
  if (!description) {
    return { error: "Description is required" }
  }
  if (!websiteUrl) {
    return { error: "Website URL is required" }
  }
  if (!logoUrl) {
    return { error: "Logo URL is required" }
  }

  try {
    new URL(websiteUrl)
  } catch {
    return { error: "Website URL must be a valid URL" }
  }

  try {
    const duplicate = await prisma.alternativeProduct.findFirst({
      where: {
        websiteUrl,
        NOT: { id },
      },
      select: { id: true },
    })
    if (duplicate) {
      return { error: "Another alternative already uses this website URL" }
    }

    await prisma.alternativeProduct.update({
      where: { id },
      data: {
        name,
        description,
        websiteUrl,
        logoUrl,
        categories: {
          set: data.categoryIds.map((categoryId) => ({ id: categoryId })),
        },
        products: {
          set: data.productIds.map((productId) => ({ id: productId })),
        },
      },
    })

    revalidateAlternativeProduct(id)
    data.productIds.forEach((productId) => {
      revalidateProduct(productId)
    })

    return { success: true }
  } catch (error) {
    console.error("Error updating alternative product:", error)
    return { error: "Failed to update alternative product" }
  }
}

export async function deleteAlternativeProductAction(id: string) {
  try {
    const existing = await prisma.alternativeProduct.findUnique({
      where: { id },
      select: {
        id: true,
        products: {
          select: { id: true },
        },
      },
    })

    if (!existing) {
      return { error: "Alternative product not found" }
    }

    await prisma.alternativeProduct.delete({
      where: { id },
    })

    revalidateAlternativeProduct(id, "revalidate")
    existing.products.forEach((product) => {
      revalidateProduct(product.id)
    })

    return { success: true }
  } catch (error) {
    console.error("Error deleting alternative product:", error)
    return { error: "Failed to delete alternative product" }
  }
}
