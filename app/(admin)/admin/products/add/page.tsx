import { getCategories } from "@/actions/admin/categories/actions"
import AddProductForm from "./form"
import { getUsers } from "@/actions/admin/users/actions"
import { getOrganizations } from "@/actions/admin/organizations/actions"

export default async function AddProductPage() {
  const categories = await getCategories({ select: { id: true, name: true } })
  const users = await getUsers({ select: { id: true, email: true } })
  const organizations = await getOrganizations({ select: { id: true, name: true } })

  return (
    <AddProductForm
      categories={categories}
      users={users}
      organizations={organizations}
    />
  )
}
