import { notFound } from "next/navigation"
import { getPlanById } from "@/actions/admin/plans/actions"
import EditPlanForm from "./form"

export default async function EditPlanPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const plan = await getPlanById(id)

  if (!plan) return notFound()

  return <EditPlanForm plan={plan} />
}
