import { notFound } from "next/navigation"

import { AlternativeProductForm } from "../../_components/AlternativeProductForm"
import { getAlternativeProductById } from "@/actions/admin/alternative-products/actions"
import { getCategories } from "@/actions/admin/categories/actions"
import { getProducts } from "@/actions/admin/products/actions"

export default async function EditAlternativeProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [alternative, categories, products] = await Promise.all([
    getAlternativeProductById(id),
    getCategories({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    getProducts({
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
  ])

  if (!alternative) {
    return notFound()
  }

  return (
    <AlternativeProductForm
      mode="edit"
      alternativeId={alternative.id}
      defaultValues={{
        name: alternative.name,
        description: alternative.description,
        websiteUrl: alternative.websiteUrl,
        logoUrl: alternative.logoUrl,
        categoryIds: alternative.categories.map((category) => category.id),
        productIds: alternative.products.map((product) => product.id),
      }}
      categories={categories}
      products={products}
    />
  )
}
