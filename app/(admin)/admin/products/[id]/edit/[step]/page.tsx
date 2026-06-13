import { notFound, redirect } from "next/navigation"

import { getCategories } from "@/actions/admin/categories/actions"
import { getProductForEditWizard } from "@/actions/admin/products/actions"
import { getUsers } from "@/actions/admin/users/actions"
import {
  isProductDraftStep,
  type ProductDraftStep,
} from "@/lib/productWizard/draft"
import { adminPath } from "@/lib/routes"
import EditProductForm from "../form"

export default async function EditProductStepPage({
  params,
}: {
  params: Promise<{ id: string; step: string }>
}) {
  const { id, step: rawStep } = await params
  if (!isProductDraftStep(rawStep)) {
    redirect(adminPath("products", id, "edit", "configuration"))
  }

  const [product, categories, users] = await Promise.all([
    getProductForEditWizard(id),
    getCategories({ select: { id: true, name: true, icon: true } }),
    getUsers({
      select: { id: true, email: true, clerkId: true },
    }),
  ])

  if (!product) return notFound()

  return (
    <EditProductForm
      product={product}
      categories={categories}
      users={users}
      step={rawStep as ProductDraftStep}
    />
  )
}
