"use server"

import { deleteCategory } from "@/controllers/categories"

export async function deleteCategoryAction(id: string) {
  return deleteCategory(id)
}
