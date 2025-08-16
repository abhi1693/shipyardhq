import { notFound } from "next/navigation"
import { getUseCaseById } from "@/actions/admin/categories/actions"
import { ObjectPageLayout } from "@/components/layout/object-view/page-layout"
import { Prisma, UseCaseCategory } from "@prisma/client"
import { UseCaseCategoryRelationship } from "@/app/(admin)/admin/categories/use-cases/[id]/relationships/categories"

export default async function ViewUseCasePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const useCase = (await getUseCaseById(id, {
    include: {
      categories: {
        include: { category: true },
      },
    },
  })) as Prisma.UseCaseGetPayload<{
    include: { categories: { include: { category: true } } }
  }>

  if (!useCase) return notFound()

  return (
    <ObjectPageLayout
      heading={{
        id: useCase.id,
        title: useCase.label,
        createdAt: useCase.createdAt,
        updatedAt: useCase.updatedAt,
        slug: useCase.slug,
      }}
      overview={[
        { label: "Label", value: useCase.label },
        { label: "Slug", value: useCase.slug },
      ]}
      basePath="admin/categories/use-cases"
      deletable
      editable
      relationships={
        <UseCaseCategoryRelationship
          rows={
            useCase.categories as unknown as (UseCaseCategory & {
              category: { id: string; name: string; slug: string }
            })[]
          }
        />
      }
    />
  )
}
