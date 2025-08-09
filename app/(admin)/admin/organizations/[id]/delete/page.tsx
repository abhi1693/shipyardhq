import { redirect } from "next/navigation"
import { deleteOrganizationAction } from "@/actions/admin/organizations/actions"

export default async function DeleteOrganizationPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = await params
  const result = await deleteOrganizationAction(id)

  if ("error" in (result as any)) {
    throw new Error((result as any).error)
  }

  redirect("/admin/organizations")
}

