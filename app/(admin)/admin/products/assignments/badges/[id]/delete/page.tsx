import { redirect } from "next/navigation"
import { deleteProductBadgeAction } from "@/actions/admin/badges/actions"

export default async function DeleteProductBadgePage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = await params
  const result = await deleteProductBadgeAction(id)

  if ("error" in result) {
    // Optional: Redirect with error message or fallback
    throw new Error(result.error)
  }

  redirect("/admin/products/assignments/badges")
}
