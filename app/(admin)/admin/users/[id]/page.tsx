import { notFound } from "next/navigation"
import { Metadata } from "next"
import { ObjectPageLayout } from "@/components/layout/object-view/page-layout"
import { getUserById } from "@/actions/admin/users/actions"

export const metadata: Metadata = {
  title: "View User",
  description: "View user details",
}

export default async function ViewUserPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = await params
  const user = await getUserById(id)
  if (!user) return notFound()

  return (
    <ObjectPageLayout
      heading={{
        id: user.id,
        title: `${user.firstName} ${user.lastName}`,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        slug: user.email,
      }}
      overview={[
        { label: "Email", value: user.email },
        { label: "First Name", value: user.firstName },
        { label: "Last Name", value: user.lastName },
        { label: "Role", value: user.role },
        { label: "Clerk ID", value: user.clerkId },
      ]}
      basePath="users"
      editable
      deletable
    />
  )
}
