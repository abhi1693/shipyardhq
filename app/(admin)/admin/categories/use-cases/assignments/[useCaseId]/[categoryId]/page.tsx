import { notFound } from "next/navigation"
import prisma from "@/lib/prisma"
import { ObjectPageLayout } from "@/components/layout/object-view/page-layout"

export default async function ViewAssignmentPage({
  params,
}: {
  params: { useCaseId: string; categoryId: string }
}) {
  const { useCaseId, categoryId } = await params

  const assignment = await prisma.useCaseCategory.findUnique({
    where: { useCaseId_categoryId: { useCaseId, categoryId } },
    include: { useCase: true, category: true },
  })

  if (!assignment) return notFound()

  return (
    <ObjectPageLayout
      heading={{
        id: `${useCaseId}/${categoryId}`,
        title: `${assignment.useCase.label} → ${assignment.category.name}`,
        createdAt: assignment.useCase.createdAt,
        updatedAt: assignment.category.updatedAt,
        slug: `${assignment.useCase.slug} • ${assignment.category.slug}`,
      }}
      overview={[
        { label: "Use Case", value: assignment.useCase.label },
        { label: "Use Case Slug", value: assignment.useCase.slug },
        { label: "Category", value: assignment.category.name },
        { label: "Category Slug", value: assignment.category.slug },
      ]}
      basePath="admin/categories/use-cases/assignments"
      deletable
      editable
    />
  )
}

