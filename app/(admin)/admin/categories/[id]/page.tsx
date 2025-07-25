import { notFound } from "next/navigation"
import { Metadata } from "next"
import { getCategoryById } from "@/controllers/categories"
import { ObjectPageLayout } from "@/components/layout/object-view/page-layout"

export const metadata: Metadata = {
  title: "View Category",
  description: "View category details",
}

export default async function ViewCategoryPage({
  params,
}: {
  params: { id: string }
}) {
  const category = await getCategoryById(params.id)
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
