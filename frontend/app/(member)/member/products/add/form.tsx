"use client"

import AddProductWizard from "@/components/pages/products/AddProductWizard"

export default function AddProductForm({
  categories,
  userId,
  alternatives,
  onCreateProduct,
}: {
  categories: { id: string; name: string; icon?: string | null }[]
  userId: string
  alternatives: {
    id: string
    slug?: string | null
    name: string
    websiteUrl?: string | null
  }[]
  onCreateProduct: (formData: FormData) => Promise<unknown>
}) {
  return (
    <AddProductWizard
      categories={categories}
      userId={userId}
      alternatives={alternatives}
      onCreateProduct={onCreateProduct}
    />
  )
}

export type { ProductWizardInputAdd as AddProductValues } from "@/lib/productWizard/schema"
