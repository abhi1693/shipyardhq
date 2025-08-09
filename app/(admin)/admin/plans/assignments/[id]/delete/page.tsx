import { redirect } from "next/navigation"
import { deletePlanFeatureAssignmentAction } from "@/actions/admin/plans/assignments/actions"

export default async function DeleteAssignedFeaturePage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = await params
  const result = await deletePlanFeatureAssignmentAction(id)

  if ("error" in result) {
    throw new Error(result.error)
  }

  redirect("/admin/plans/assignments")
}
