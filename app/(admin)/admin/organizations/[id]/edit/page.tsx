import { notFound } from "next/navigation"
import { getOrganizationById } from "@/actions/admin/organizations/actions"
import EditOrganizationForm from "./form"

export default async function EditOrganizationPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = await params
  const org = await getOrganizationById(id)
  if (!org) return notFound()
  return <EditOrganizationForm organization={org} />
}
