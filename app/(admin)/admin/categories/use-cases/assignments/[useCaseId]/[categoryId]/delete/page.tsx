import { redirect } from "next/navigation"
import { deleteUseCaseAssignmentAction } from "@/actions/admin/categories/actions"

export default async function DeleteAssignmentPage({
  params,
}: {
  params: { useCaseId: string; categoryId: string }
}) {
  const { useCaseId, categoryId } = await params
  const result = await deleteUseCaseAssignmentAction({ useCaseId, categoryId })

  if ("error" in result) {
    throw new Error(result.error)
  }

  redirect("/admin/categories/use-cases/assignments")
}
