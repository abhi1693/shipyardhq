import { notFound } from "next/navigation"
import { getCategoryById } from "@/actions/admin/categories/actions"
import { ObjectPageLayout } from "@/components/layout/object-view/page-layout"
import { Prisma } from "@prisma/client"
import { CategoryProductRelationship } from "@/app/(admin)/admin/categories/[id]/relationships/products"
import { CategoryUseCaseRelationship } from "@/app/(admin)/admin/categories/[id]/relationships/use-cases"

export default async function ViewCategoryPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = await params
  const category = (await getCategoryById(id, {
    include: {
      products: {
        include: {
          user: true,
        },
      },
      useCases: {
        include: {
          useCase: true,
        },
      },
    },
  })) as Prisma.CategoryGetPayload<{
    include: {
      products: {
        include: {
          user: true
        }
      },
      useCases: {
        include: {
          useCase: true
        }
      }
    }
  }>

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
        { label: "Description", value: category.description },
      ]}
      basePath="admin/categories"
      deletable
      editable
      relationships={
        <>
          <CategoryProductRelationship rows={category.products} />
          <CategoryUseCaseRelationship rows={category.useCases} />
        </>
      }
    />
  )
}
