import { redirect } from "next/navigation"
import { deleteUseCaseAction } from "@/actions/admin/categories/actions"

export default async function DeleteUseCasePage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = await params
  const result = await deleteUseCaseAction(id)

  if ("error" in result) {
    throw new Error(result.error)
  }

  redirect("/admin/categories/use-cases")
}

