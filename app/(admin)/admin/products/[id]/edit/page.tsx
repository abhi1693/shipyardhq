import { notFound } from "next/navigation"
import { getProductById } from "@/actions/admin/products/actions"
import EditProductForm from "./form"
import { getCategories } from "@/actions/admin/categories/actions"
import { getUsers } from "@/actions/admin/users/actions"

export default async function EditProductPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = await params
  const product = await getProductById(id)
  if (!product) return notFound()

  const categories = await getCategories({ select: { id: true, name: true } })
  const users = await getUsers({ select: { id: true, email: true } })

  return (
    <EditProductForm product={product} categories={categories} users={users} />
  )
}
