import { redirect } from "next/navigation"
import { deletePlanFeatureAssignmentAction } from "@/actions/admin/plans/assignments/actions"

export default async function DeleteAssignedFeaturePage({
  params,
}: {
  params: { id: string }
}) {
  const result = await deletePlanFeatureAssignmentAction(params.id)

  if ("error" in result) {
    throw new Error(result.error)
  }

  redirect("/admin/plans/assignments")
}
