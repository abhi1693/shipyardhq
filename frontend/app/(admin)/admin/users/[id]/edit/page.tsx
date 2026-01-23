import { notFound } from "next/navigation"
import { Metadata } from "next"
import { getUserById } from "@/actions/admin/users/actions"
import EditUserForm from "./form"
import { buildPageMetadata } from "@/lib/metadata"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const user = await getUserById(id)

  if (!user) {
    return buildPageMetadata({
      title: "Edit User",
      section: "Admin",
      description: "Update user details.",
    })
  }

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.email ||
    "User"

  return buildPageMetadata({
    title: `Edit ${displayName}`,
    section: "Admin",
    description: `Update ${displayName} details.`,
  })
}

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getUserById(id)
  if (!user) return notFound()

  return <EditUserForm user={user} />
}
