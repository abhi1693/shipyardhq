import { redirect } from "next/navigation"
import { deleteProductAction } from "@/actions/admin/products/actions"

export default async function DeleteProductPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = await params
  const result = await deleteProductAction(id)

  if ("error" in result) {
    // Optional: Redirect with error message or fallback
    throw new Error(result.error)
  }

  redirect("/member/products")
}
