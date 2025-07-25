"use server"

import { createCategory } from "@/controllers/categories"

export async function createCategoryAction(formData: FormData) {
  const name = formData.get("name")

  if (typeof name !== "string" || name.trim() === "") {
    return { error: "Name is required" }
  }

  const result = await createCategory({ name })

  if ("error" in result) {
    return { error: result.error }
  }

  return { success: true }
}
