"use client"

import EditProductWizard from "@/components/pages/products/EditProductWizard"
import type { ProductForEditWizard } from "@/types/product-wizard"

export default function EditProductForm({
  product,
  categories,
  alternatives,
}: {
  product: ProductForEditWizard
  categories: { id: string; name: string; icon?: string | null }[]
  alternatives: {
    id: string
    slug?: string | null
    name: string
    websiteUrl?: string | null
  }[]
}) {
  return (
    <EditProductWizard
      mode="member"
      product={product}
      categories={categories}
      alternatives={alternatives}
    />
  )
}

export type { ProductWizardInputEdit as EditProductValues } from "@/lib/productWizard/schema"
