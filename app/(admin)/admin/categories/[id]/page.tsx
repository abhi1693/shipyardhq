import { notFound } from "next/navigation"
import { Metadata } from "next"
import { ObjectPageLayout } from "@/components/layout/object-view/page-layout"
import { getCategoryById } from "@/actions/admin/categories/actions"

export const metadata: Metadata = {
  title: "View Category",
  description: "View category details",
}

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
      editable
      deletable
    />
  )
}
