import { redirect } from "next/navigation"
import { deleteProductAction } from "@/actions/admin/products/actions"
import prisma from "@/lib/prisma"

export default async function DeleteProductPage({
  params,
}: {
  params: { slug: string }
}) {
  const { slug } = await params
  const found = await prisma.product.findUnique({ where: { slug }, select: { id: true } })
  const id = found?.id
  const result = id ? await deleteProductAction(id) : { error: "Product not found" }

  if ("error" in result) {
    // Optional: Redirect with error message or fallback
    throw new Error(result.error)
  }

  redirect("/member/products")
}
