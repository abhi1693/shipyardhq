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
  users,
  connector,
}: {
  product: ProductForEditWizard
  categories: { id: string; name: string; icon?: string | null }[]
  users: { id: string; email: string; clerkId: string }[]
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
      users={users}
      connector={connector}
    />
  )
}
