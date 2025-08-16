import { redirect } from "next/navigation"
import { deletePlanFeatureAction } from "@/actions/admin/plans/features/actions"

export default async function DeletePlanFeaturePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await deletePlanFeatureAction(id)

  if ("error" in result) {
    // Optional: Redirect with error message or fallback
    throw new Error(result.error)
  }

  redirect("/admin/plans/features")
}
