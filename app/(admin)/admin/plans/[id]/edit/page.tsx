import { notFound } from "next/navigation"
import { getPlanById } from "@/actions/admin/plans/actions"
import EditPlanForm from "./form"

export default async function EditPlanPage({
  params,
}: {
  params: { id: string }
}) {
  const plan = await getPlanById(params.id)

  if (!plan) return notFound()

  return <EditPlanForm plan={plan} />
}
