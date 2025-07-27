import { redirect } from "next/navigation"
import { deleteBadge } from "@/actions/admin/badges/actions"

export default async function DeleteBadgePage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = await params
  const result = await deleteBadge(id)

  if ("error" in result) {
    // Optional: Redirect with error message or fallback
    throw new Error(result.error)
  }

  redirect("/admin/products/badges")
}
