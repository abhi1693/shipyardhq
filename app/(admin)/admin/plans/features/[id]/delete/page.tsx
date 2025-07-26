import { redirect } from "next/navigation"
import { deletePlanFeatureAction } from "@/actions/admin/plans/features/actions"

export default async function DeletePlanFeaturePage({
  params,
}: {
  params: { id: string }
}) {
  const result = await deletePlanFeatureAction(params.id)

  if ("error" in result) {
    // Optional: Redirect with error message or fallback
    throw new Error(result.error)
  }

  redirect("/admin/plans/features")
}
