import { getCategories } from "@/actions/admin/categories/actions"
import AddProductForm from "./form"
import { getUsers } from "@/actions/admin/users/actions"

export default async function AddProductPage() {
  const categories = await getCategories({
    select: { id: true, name: true, icon: true },
  })
  const users = await getUsers({
    select: { id: true, email: true, clerkId: true },
  })

  return <AddProductForm categories={categories} users={users} />
}
