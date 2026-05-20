import { notFound } from "next/navigation"
import { getProductForEditWizard } from "@/actions/admin/products/actions"
import { getCategories } from "@/actions/admin/categories/actions"
import { getUsers } from "@/actions/admin/users/actions"
import EditProductForm from "./form"

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [product, categories, users] = await Promise.all([
    getProductForEditWizard(id),
    getCategories({ select: { id: true, name: true, icon: true } }),
    getUsers({
      select: { id: true, email: true, clerkId: true },
    }),
  ])

  if (!product) return notFound()

  return (
    <EditProductForm product={product} categories={categories} users={users} />
  )
}
