import { getCategories } from "@/actions/admin/categories/actions"
import AddProductForm from "./form"
import { getUserByClerkId } from "@/actions/member/users/actions"
import { auth } from "@clerk/nextjs/server"
import { getMyOrganizations } from "@/actions/member/organizations/actions"
import { memberHasFeature } from "@/lib/memberFeatures"
import { getAlternativeProducts } from "@/actions/admin/alternative-products/actions"

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

  const [categories, organizations, alternatives] = await Promise.all([
    getCategories({ orderBy: { name: "asc" } }).catch(() => []),
    getMyOrganizations().catch(() => []),
    getAlternativeProducts({
      select: { id: true, name: true, websiteUrl: true },
      orderBy: { name: "asc" },
    }).catch(() => []),
  ])

  const canEditCTA = await memberHasFeature("customCTA")

  return (
    <AddProductForm
      categories={categories}
      organizations={organizations}
      userId={dbUser.id}
      canEditCTA={canEditCTA}
      alternatives={alternatives}
    />
  )
}
