import { getPlanFeatureById } from "@/actions/admin/plans/features/actions"
import EditPlanFeatureForm from "./form"
import { notFound } from "next/navigation"

export default async function EditPlanFeaturePage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = await params
  const feature = await getPlanFeatureById(id)

  if (!feature) return notFound()

  return (
    <EditPlanFeatureForm
      id={feature.id}
      name={feature.name}
      description={feature.description}
    />
  )
}
