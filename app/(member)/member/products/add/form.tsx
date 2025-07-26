"use client"

import PageContainer from "@/components/layout/page-container"
import { createProductAction } from "@/actions/admin/products/actions"
import {
  ProductForm,
  ProductFormInput,
} from "@/components/organisms/ProductForm"

export default function AddProductForm({
  categories,
  userId,
}: {
  categories: { id: string; name: string }[]
  userId: string
}) {
  async function handleSubmit(values: ProductFormInput) {
    const formData = new FormData()
    for (const [key, value] of Object.entries(values)) {
      if (value) formData.append(key, value)
    }
    formData.append("userId", userId)
    const result = await createProductAction(formData)
    if (result?.error) throw new Error(result.error)
  }

  return (
    <PageContainer>
      <ProductForm
        mode="add"
        categories={categories}
        defaultValues={{}}
        onSubmit={handleSubmit}
      />
    </PageContainer>
  )
}
