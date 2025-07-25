import { notFound } from "next/navigation"
import { Metadata } from "next"
import { getCategoryById } from "@/controllers/categories"
import PageContainer from "@/components/layout/page-container"
import { ObjectHeading } from "@/components/layout/object-heading"

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
    <PageContainer>
      <ObjectHeading
        title={category.name}
        createdAt={category.createdAt}
        updatedAt={category.updatedAt}
        slug={category.slug}
      />
    </PageContainer>
  )
}
