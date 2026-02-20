"use client"

import EditProductWizard from "@/components/pages/products/EditProductWizard"
import type { ProductForEditWizard } from "@/types/product-wizard"

export default function EditProductForm({
  product,
  categories,
  alternatives,
  connector,
  onUpdateProduct,
  onResetConnector,
}: {
  product: ProductForEditWizard
  categories: { id: string; name: string; icon?: string | null }[]
  alternatives: {
    id: string
    slug?: string | null
    name: string
    websiteUrl?: string | null
  }[]
  connector?: {
    id: string
    provider?: string | null
    status?: string | null
    lastSyncedAt?: Date | string | null
    lastSyncError?: string | null
    keyHint?: string | null
    accountId?: string | null
    brandId?: string | null
  } | null
  onUpdateProduct: (
    productId: string,
    payload: any,
  ) => Promise<unknown>
  onResetConnector: (productId: string) => Promise<unknown>
}) {
  return (
    <EditProductWizard
      mode="member"
      product={product}
      categories={categories}
      alternatives={alternatives}
      connector={connector}
      onUpdateProduct={onUpdateProduct}
      onResetConnector={onResetConnector}
    />
  )
}

export type { ProductWizardInputEdit as EditProductValues } from "@/lib/productWizard/schema"
