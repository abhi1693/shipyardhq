import { notFound, redirect } from "next/navigation"

import { getCategories } from "@/actions/admin/categories/actions"
import { getUsers } from "@/actions/admin/users/actions"
import { getProductDraftForCurrentUser } from "@/actions/product-drafts/actions"
import ProductDraftStepForm from "@/components/pages/products/ProductDraftStepForm"
import {
  isProductDraftStep,
  mergeDraftPayload,
  productDraftStepPath,
} from "@/lib/productWizard/draft"

export default async function AdminProductDraftStepPage({
  params,
}: {
  params: Promise<{ draftId: string; step: string }>
}) {
  const { draftId, step: rawStep } = await params
  if (!isProductDraftStep(rawStep)) {
    redirect(productDraftStepPath("admin", draftId, "configuration"))
  }

  const draft = await getProductDraftForCurrentUser(draftId, "admin")
  if (!draft) return notFound()

  const [categories, users] = await Promise.all([
    getCategories({ select: { id: true, name: true, icon: true } }),
    getUsers({
      select: { id: true, email: true, clerkId: true },
    }),
  ])

  return (
    <ProductDraftStepForm
      mode="admin"
      draftId={draft.id}
      productId={draft.productId}
      step={rawStep}
      initialValues={mergeDraftPayload(draft.payload)}
      categories={categories}
      users={users}
    />
  )
}
