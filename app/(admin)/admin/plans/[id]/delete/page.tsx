import { redirect } from "next/navigation"
import { deletePlanAction } from "@/actions/admin/plans/actions"

export default async function DeletePlanPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await deletePlanAction(id)

  if ("error" in result) {
    // Optional: Redirect with error message or show custom UI
    throw new Error(result.error)
  }

  redirect("/admin/plans")
}
