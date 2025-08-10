import { notFound } from "next/navigation"
import { getOrganizationById } from "@/actions/admin/organizations/actions"
import { getUsers } from "@/actions/admin/users/actions"
import AddOrgMemberForm from "./form"

export default async function AddOrgMemberPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = await params
  const [org, users] = await Promise.all([
    getOrganizationById(id),
    getUsers({
      select: { id: true, email: true, firstName: true, lastName: true },
    }),
  ])
  if (!org) return notFound()
  return <AddOrgMemberForm organizationId={org.id} users={users} />
}
