import { notFound } from "next/navigation"
import { getCategories } from "@/actions/admin/categories/actions"
import EditProductForm from "./form"
import { getProductById } from "@/actions/admin/products/actions"
import { getMyOrganizations } from "@/actions/member/organizations/actions"

export default async function EditProductPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = await params
  const product = await getProductById(id)
  if (!product) return notFound()

  const [categories, organizations] = await Promise.all([
    getCategories(),
    getMyOrganizations().catch(() => []),
  ])

  return (
    <EditProductForm
      product={product}
      categories={categories}
      organizations={organizations}
    />
  )
}
