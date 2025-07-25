import { notFound } from "next/navigation"
import {
  getCategoryById,
} from "@/actions/admin/categories/actions"
import { ObjectPageLayout } from "@/components/layout/object-view/page-layout"

export default async function ViewCategoryPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = await params
  const category = await getCategoryById(id)
  if (!category) return notFound()

  return (
    <ObjectPageLayout
      heading={{
        id: category.id,
        title: category.name,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
        slug: category.slug,
      }}
      overview={[
        { label: "Name", value: category.name },
        { label: "Slug", value: category.slug },
      ]}
      basePath="categories"
      deletable
      editable
    />
  )
}
