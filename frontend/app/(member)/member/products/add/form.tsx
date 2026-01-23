"use client"

import AddProductWizard from "@/components/pages/products/AddProductWizard"

export default function AddProductForm({
  categories,
  userId,
  alternatives,
}: {
  categories: { id: string; name: string; icon?: string | null }[]
  userId: string
  alternatives: {
    id: string
    slug?: string | null
    name: string
    websiteUrl?: string | null
  }[]
}) {
  return (
    <AddProductWizard
      mode="member"
      categories={categories}
      userId={userId}
      alternatives={alternatives}
    />
  )
}

export type { ProductWizardInputAdd as AddProductValues } from "@/lib/productWizard/schema"
