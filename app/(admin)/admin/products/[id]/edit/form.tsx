"use client"

import EditProductWizard from "@/components/pages/products/EditProductWizard"
import type {
  PaymentConnectorProvider,
  PaymentConnectorStatus,
} from "@/lib/vendor/prisma/client/enums"
import type { ProductForEditWizard } from "@/types/product-wizard"

export default function EditProductForm({
  product,
  categories,
  organizations,
  users,
  connector,
}: {
  product: ProductForEditWizard
  categories: { id: string; name: string; icon?: string | null }[]
  organizations: { id: string; name: string }[]
  users: { id: string; email: string }[]
  connector?: {
    id: string
    provider: PaymentConnectorProvider
    status: PaymentConnectorStatus | null
    lastSyncedAt?: Date | string | null
    lastSyncError?: string | null
    keyHint?: string | null
    accountId?: string | null
    brandId?: string | null
  } | null
}) {
  return (
    <EditProductWizard
      mode="admin"
      product={product}
      categories={categories}
      organizations={organizations}
      users={users}
      connector={connector}
    />
  )
}
