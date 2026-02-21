"use client"

import EditProductWizard from "@/components/pages/products/EditProductWizard"
import type { ProductForEditWizard } from "@/types/product-wizard"

export default function EditProductForm({
  product,
  categories,
  alternatives,
  connector,
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
}) {
  const onUpdateProduct = async (productId: string, payload: any) => {
    const response = await fetch("/api/member/products/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        payload,
      }),
    })
    const result = (await response.json()) as { error?: string }
    if (!response.ok && !result.error) {
      return { error: "Failed to update product" }
    }
    return result
  }

  const onResetConnector = async (productId: string) => {
    const response = await fetch("/api/member/products/reset-connector", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    })
    const result = (await response.json()) as { error?: string }
    if (!response.ok && !result.error) {
      return { error: "Failed to reset connector" }
    }
    return result
  }

  return (
    <EditProductWizard
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
