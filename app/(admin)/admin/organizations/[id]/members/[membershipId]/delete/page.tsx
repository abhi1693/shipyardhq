import { redirect } from "next/navigation"
import { deleteOrganizationMembershipAction } from "@/actions/admin/organizations/actions"

export default async function DeleteMembershipPage({
  params,
}: {
  params: Promise<{ id: string; membershipId: string }>
}) {
  const { id, membershipId } = await params
  const result = await deleteOrganizationMembershipAction(membershipId)
  if ((result as any)?.error) {
    throw new Error((result as any).error)
  }
  redirect(`/admin/organizations/${id}`)
}
