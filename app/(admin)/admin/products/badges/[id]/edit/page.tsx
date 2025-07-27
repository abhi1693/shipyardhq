import { notFound } from "next/navigation"
import { getBadgeById } from "@/actions/admin/badges/actions"
import EditBadgeForm from "./form"

export default async function EditBadgePage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = await params
  const badge = await getBadgeById(id)
  if (!badge) return notFound()

  return <EditBadgeForm badge={badge} />
}
