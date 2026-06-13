import { redirect } from "next/navigation"

import { adminPath } from "@/lib/routes"

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(adminPath("products", id, "edit", "configuration"))
}
