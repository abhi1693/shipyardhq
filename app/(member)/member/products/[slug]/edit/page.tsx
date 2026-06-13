import { redirect } from "next/navigation"

import { memberProductPath } from "@/lib/routes"

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  redirect(`${memberProductPath(slug)}/edit/configuration`)
}
