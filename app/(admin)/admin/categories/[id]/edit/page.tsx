import { notFound } from "next/navigation"
import { Metadata } from "next"
import EditCategoryForm from "./form"
import { getCategoryById } from "@/actions/admin/categories/actions"

export const metadata: Metadata = {
  title: "Edit Category",
  description: "Modify category details",
}

export default async function EditCategoryPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = await params
  const category = await getCategoryById(id)
  if (!category) return notFound()

  return (
    <EditCategoryForm
      id={category.id}
      name={category.name}
      description={category.description}
    />
  )
}
