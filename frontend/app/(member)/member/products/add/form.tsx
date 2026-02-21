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
  const onCreateProduct = async (formData: FormData) => {
    const response = await fetch("/api/member/products/create", {
      method: "POST",
      body: formData,
    })
    const payload = (await response.json()) as {
      error?: string
      slug?: string
      success?: boolean
    }
    if (!response.ok && !payload.error) {
      return { error: "Failed to create product" }
    }
    return payload
  }

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
