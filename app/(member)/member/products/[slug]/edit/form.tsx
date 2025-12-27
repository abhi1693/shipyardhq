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
      mode="member"
      product={product}
      categories={categories}
      alternatives={alternatives}
      connector={connector}
    />
  )
}

export type { ProductWizardInputEdit as EditProductValues } from "@/lib/productWizard/schema"
