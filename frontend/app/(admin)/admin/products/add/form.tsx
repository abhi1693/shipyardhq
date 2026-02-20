"use client"

import AddProductWizard from "@/components/pages/products/AddProductWizard"

export default function AddProductForm({
  categories,
  users,
  onCreateProduct,
}: {
  categories: { id: string; name: string; icon?: string | null }[]
  users: { id: string; email: string; clerkId: string }[]
  onCreateProduct: (formData: FormData) => Promise<unknown>
}) {
  return (
    <AddProductWizard
      mode="admin"
      categories={categories}
      users={users}
      onCreateProduct={onCreateProduct}
    />
  )
}
