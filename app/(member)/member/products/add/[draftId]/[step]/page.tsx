import { notFound, redirect } from "next/navigation"

import {
  getAlternativeProducts,
  getCategories,
} from "@/actions/catalog/actions"
import { getProductDraftForCurrentUser } from "@/actions/product-drafts/actions"
import ProductDraftStepForm from "@/components/pages/products/ProductDraftStepForm"
import {
  isProductDraftStep,
  mergeDraftPayload,
  productDraftStepPath,
} from "@/lib/productWizard/draft"

export default async function MemberProductDraftStepPage({
  params,
}: {
  params: Promise<{ draftId: string; step: string }>
}) {
  const { draftId, step: rawStep } = await params
  if (!isProductDraftStep(rawStep)) {
    redirect(productDraftStepPath("member", draftId, "configuration"))
  }

  const draft = await getProductDraftForCurrentUser(draftId, "member")
  if (!draft) return notFound()

  const [categories, alternatives] = await Promise.all([
    getCategories({ orderBy: { name: "asc" } }).catch(() => []),
    getAlternativeProducts({
      select: { id: true, slug: true, name: true, websiteUrl: true },
      orderBy: { name: "asc" },
    }).catch(() => []),
  ])

  return (
    <ProductDraftStepForm
      mode="member"
      draftId={draft.id}
      productId={draft.productId}
      step={rawStep}
      initialValues={mergeDraftPayload(draft.payload)}
      categories={categories}
      alternatives={alternatives}
    />
  )
}
