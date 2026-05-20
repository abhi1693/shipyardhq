"use client"

import EditProductWizard from "@/components/pages/products/EditProductWizard"
import type { ProductForEditWizard } from "@/types/product-wizard"

export default function EditProductForm({
  product,
  categories,
  users,
}: {
  product: ProductForEditWizard
  categories: { id: string; name: string; icon?: string | null }[]
  users: { id: string; email: string; clerkId: string }[]
}) {
  return (
    <EditProductWizard
      mode="admin"
      product={product}
      categories={categories}
      users={users}
    />
  )
}
