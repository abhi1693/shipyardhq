import { notFound } from "next/navigation"
import { getProductById } from "@/actions/admin/products/actions"
import { getCategories } from "@/actions/admin/categories/actions"
import { getUsers } from "@/actions/admin/users/actions"
import { getOrganizations } from "@/actions/admin/organizations/actions"
import EditProductForm from "./form"
import { getPlans } from "@/actions/admin/plans/actions"

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [product, categories, users, organizations, plans] = await Promise.all([
    getProductById(id),
    getCategories({ select: { id: true, name: true } }),
    getUsers({
      select: { id: true, email: true, firstName: true, lastName: true },
    }),
    getOrganizations({ select: { id: true, name: true } }),
    getPlans({ select: { id: true, name: true, price: true } }),
  ])

  if (!product) return notFound()

  return (
    <EditProductForm
      product={product}
      categories={categories}
      users={users}
      organizations={organizations}
      plans={plans}
    />
  )
}
