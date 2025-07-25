import { redirect } from "next/navigation"
import { deleteCategoryAction } from "@/actions/admin/categories/actions"

export default async function DeleteCategoryPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = await params
  const result = await deleteCategoryAction(id)

  if ("error" in result) {
    throw new Error(result.error)
  }

  redirect("/admin/categories")
}
