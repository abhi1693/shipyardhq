import { notFound } from "next/navigation"
import { Metadata } from "next"
import EditCategoryForm from "./form"
import { getCategoryById } from "@/actions/admin/categories/actions"
import { buildPageMetadata } from "@/lib/metadata"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const category = await getCategoryById(id)

  if (!category) {
    return buildPageMetadata({
      title: "Edit Category",
      section: "Admin",
      description: "Modify category details.",
    })
  }

  return buildPageMetadata({
    title: `Edit ${category.name}`,
    section: "Admin",
    description: `Modify ${category.name} category details.`,
  })
}

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const category = await getCategoryById(id)
  if (!category) return notFound()

  return (
    <EditCategoryForm
      id={category.id}
      name={category.name}
      description={category.description}
      icon={(category as any).icon ?? undefined}
    />
  )
}
