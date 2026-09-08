import { auth } from "@clerk/nextjs/server"

import { notFound, redirect } from "next/navigation"

import { getAlternativeProducts, getCategories } from "@/lib/server/catalog"
import { getProductForEditWizard } from "@/actions/products/actions"
import {
  isProductDraftStep,
  type ProductDraftStep,
} from "@/lib/productWizard/draft"
import { memberProductPath } from "@/lib/routes"
import { requireManageableProduct } from "@/lib/server/productAccess"
import EditProductForm from "../form"

export default async function EditProductStepPage({
  params,
}: {
  params: Promise<{ slug: string; step: string }>
}) {
  await auth.protect()

  const { slug, step: rawStep } = await params
  if (!isProductDraftStep(rawStep)) {
    redirect(`${memberProductPath(slug)}/edit/configuration`)
  }

  const { product: summary } = await requireManageableProduct(slug, {
    unauthorizedRedirect: null,
    missingRedirect: null,
  })

  const product = await getProductForEditWizard(summary.id)
  if (!product) return notFound()

  const [categories, alternatives] = await Promise.all([
    getCategories({ orderBy: { name: "asc" } }),
    getAlternativeProducts({
      select: { id: true, slug: true, name: true, websiteUrl: true },
      orderBy: { name: "asc" },
    }).catch(() => []),
  ])

  return (
    <EditProductForm
      product={product}
      categories={categories}
      alternatives={alternatives}
      step={rawStep as ProductDraftStep}
    />
  )
}
