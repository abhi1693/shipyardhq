import { notFound } from "next/navigation"
import { Metadata } from "next"
import { getUserById } from "@/actions/admin/users/actions"
import EditUserForm from "./form"

export const metadata: Metadata = {
  title: "Edit User",
  description: "Update user details",
}

export default async function EditUserPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = await params
  const user = await getUserById(id)
  if (!user) return notFound()

  return <EditUserForm user={user} />
}
