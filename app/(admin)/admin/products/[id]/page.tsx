import { notFound } from "next/navigation"
import { getProductById } from "@/actions/admin/products/actions"
import { ObjectPageLayout } from "@/components/layout/object-view/page-layout"

export default async function ViewProductPage({
  params,
}: {
  params: { id: string }
}) {
  const product = await getProductById(params.id)
  if (!product) return notFound()

  return (
    <ObjectPageLayout
      heading={{
        id: product.id,
        title: product.name,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      }}
      overview={[
        { label: "Name", value: product.name },
        { label: "Description", value: product.description || "—" },
        {
          label: "Category",
          value: (
            <a
              href={`/admin/categories/${product.category.id}`}
              className="text-blue-600 underline"
            >
              {product.category.name}
            </a>
          ),
        },
        {
          label: "Created By",
          value: (
            <a
              href={`/admin/users/${product.user.id}`}
              className="text-blue-600 underline"
            >
              {product.user.email}
            </a>
          ),
        },
      ]}
      basePath="products"
      deletable
      editable
    />
  )
}
