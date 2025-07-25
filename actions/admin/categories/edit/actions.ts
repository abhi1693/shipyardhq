"use server"

import prisma from "@/lib/prisma"
import { slugify } from "@/lib/utils"

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
