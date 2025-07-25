import { getCategories } from "@/actions/admin/categories/actions"
import AddProductForm from "./form"
import { getUsers } from "@/controllers/users"

export default async function AddProductPage() {
  const categories = await getCategories({ select: { id: true, name: true } })
  const users = await getUsers({ select: { id: true, email: true } })

  return <AddProductForm categories={categories} users={users} />
}
