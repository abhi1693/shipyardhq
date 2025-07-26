"use client"

import PageContainer from "@/components/layout/page-container"
import { updateProductAction } from "@/actions/admin/products/actions"
import {
  ProductForm,
  ProductFormInput,
} from "@/components/organisms/ProductForm"

export default function EditProductForm({
  product,
  categories,
}: {
  product: {
    id: string
    name: string
    tagline?: string
    websiteUrl?: string
    logo?: string
    categoryId: string
    metadata: {
      githubUrl?: string
      twitterUrl?: string
      demoUrl?: string
      contactEmail?: string
    }
    userId: string
  }
  categories: { id: string; name: string }[]
}) {
  async function handleSubmit(values: ProductFormInput) {
    const result = await updateProductAction(product.id, {
      ...values,
      userId: product.userId,
    })
    if ("error" in result) {
      throw new Error(result.error)
    }
  }

  return (
    <PageContainer>
      <ProductForm
        mode="edit"
        categories={categories}
        defaultValues={{
          name: product.name,
          tagline: product.tagline ?? "",
          websiteUrl: product.websiteUrl ?? "",
          logo: product.logo ?? "",
          categoryId: product.categoryId,
          githubUrl: product.metadata.githubUrl ?? "",
          twitterUrl: product.metadata.twitterUrl ?? "",
          demoUrl: product.metadata.demoUrl ?? "",
          contactEmail: product.metadata.contactEmail ?? "",
        }}
        onSubmit={handleSubmit}
      />
    </PageContainer>
  )
}
