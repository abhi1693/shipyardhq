import { notFound } from "next/navigation"
import { getCategories } from "@/actions/admin/categories/actions"
import EditProductForm from "./form"
import { getProductById } from "@/actions/admin/products/actions"
import { getMyOrganizations } from "@/actions/member/organizations/actions"
import prisma from "@/lib/prisma"

export default async function EditProductPage({
  params,
}: {
  params: { slug: string }
}) {
  const { slug } = await params
  const found = await prisma.product.findUnique({ where: { slug }, select: { id: true } })
  const product = found ? await getProductById(found.id) : null
  if (!product) return notFound()

  const [categories, organizations] = await Promise.all([
    getCategories(),
    getMyOrganizations().catch(() => []),
  ])

  return (
    <EditProductForm
      product={product}
      categories={categories}
      organizations={organizations}
    />
  )
}
