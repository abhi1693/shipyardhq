import AddProductForm from "./form"
import { auth } from "@clerk/nextjs/server"
import { requireActiveUserOrRedirect } from "@/lib/server/userStatus"
import {
  getAlternativeOptionsServer,
  getCategoryOptionsServer,
} from "@/lib/server/generated-member"

export default async function AddProductPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return (
      <div className="text-center mt-12 text-muted-foreground">
        Not authenticated
      </div>
    )
  }

  const activeUser = await requireActiveUserOrRedirect(clerkId).catch(() => null)
  if (!activeUser) {
    return (
      <div className="text-center mt-12 text-destructive">
        User not found in database
      </div>
    )
  }

  const [categories, alternatives] = await Promise.all([
    getCategoryOptionsServer().catch(() => []),
    getAlternativeOptionsServer().catch(() => []),
  ])

  return (
    <AddProductForm
      categories={categories}
      userId={String(activeUser.id)}
      alternatives={alternatives}
    />
  )
}
