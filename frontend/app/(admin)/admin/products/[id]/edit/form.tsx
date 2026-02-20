"use client"

import EditProductWizard from "@/components/pages/products/EditProductWizard"
import type { ProductForEditWizard } from "@/types/product-wizard"

export default function EditProductForm({
  product,
  categories,
  users,
  connector,
  onUpdateProduct,
  onResetConnector,
}: {
  product: ProductForEditWizard
  categories: { id: string; name: string; icon?: string | null }[]
  users: { id: string; email: string; clerkId: string }[]
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
      mode="admin"
      product={product}
      categories={categories}
      users={users}
      connector={connector}
      onUpdateProduct={onUpdateProduct}
      onResetConnector={onResetConnector}
    />
  )
}
