import { notFound } from "next/navigation"
import { getCategoryById } from "@/actions/admin/categories/actions"
import { ObjectPageLayout } from "@/components/layout/object-view/page-layout"
import { Relationship } from "@/components/molecules/Relationship"
import Link from "next/link"
import { Prisma } from "@prisma/client"

export default async function ViewCategoryPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params
  const category = (await getCategoryById(id, {
    include: {
      products: {
        include: {
          user: true,
        },
      },
    },
  })) as Prisma.CategoryGetPayload<{
    include: {
      products: {
        include: {
          user: true
        }
      }
    }
  }>

  if (!category) return notFound()

  const productItems = category.products.map((product) => (
    <div key={product.id} className="flex flex-col">
      <Link
        href={`/admin/products/${product.id}`}
        className="text-blue-600 font-medium hover:underline"
      >
        {product.name}
      </Link>
      <span className="text-sm text-muted-foreground">
        Created by {product.user?.email}
      </span>
    </div>
  ))

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
      relationships={
        <>
          <Relationship title="Products in this Category">
            {productItems}
          </Relationship>
        </>
      }
    />
  )
}
