// app/admin/categories/[id]/edit/page.tsx

import { notFound } from "next/navigation"
import { Metadata } from "next"
import { getCategoryById } from "@/controllers/categories"
import EditCategoryForm from "./form"

export const metadata: Metadata = {
  title: "Edit Category",
  description: "Modify category details",
}

export default async function EditCategoryPage({
  params,
}: {
  params: { id: string }
}) {
  const category = await getCategoryById(params.id)
  if (!category) return notFound()

  return <EditCategoryForm id={category.id} name={category.name} />
}
