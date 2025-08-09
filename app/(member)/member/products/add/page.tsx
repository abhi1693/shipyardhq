import { getCategories } from "@/actions/admin/categories/actions"
import AddProductForm from "./form"
import { getUserByClerkId } from "@/actions/member/users/actions"
import { auth } from "@clerk/nextjs/server"

export default async function AddProductPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return (
      <div className="text-center mt-12 text-muted-foreground">
        Not authenticated
      </div>
    )
  }

  const dbUser = await getUserByClerkId(clerkId)
  if (!dbUser) {
    return (
      <div className="text-center mt-12 text-destructive">
        User not found in database
      </div>
    )
  }

  const categories = await getCategories().catch(() => [])

  return <AddProductForm categories={categories} userId={dbUser.id} />
}
