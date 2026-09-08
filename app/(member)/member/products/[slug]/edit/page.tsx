import { auth } from "@clerk/nextjs/server"

import { redirect } from "next/navigation"

import { memberProductPath } from "@/lib/routes"

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  await auth.protect()

  const { slug } = await params
  redirect(`${memberProductPath(slug)}/edit/configuration`)
}
