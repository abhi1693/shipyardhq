"use client"

import AddProductWizard from "@/components/pages/products/AddProductWizard"

export default function AddProductForm({
  categories,
  organizations,
  userId,
  alternatives,
}: {
  categories: { id: string; name: string; icon?: string | null }[]
  organizations: { id: string; name: string }[]
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
      organizations={organizations}
      userId={userId}
      alternatives={alternatives}
    />
  )
}

export type { ProductWizardInputAdd as AddProductValues } from "@/lib/productWizard/schema"

