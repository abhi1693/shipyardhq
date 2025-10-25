import { notFound } from "next/navigation"

import { AlternativeProductForm } from "../../_components/AlternativeProductForm"
import { getAlternativeProductById } from "@/actions/admin/alternative-products/actions"
import { getCategories } from "@/actions/admin/categories/actions"
import { getProducts } from "@/actions/admin/products/actions"
import { Prisma } from "@/lib/vendor/prisma/client"

type AlternativeWithRelations = Prisma.AlternativeProductGetPayload<{
  include: {
    categories: true
    products: { select: { id: true } }
  }
}>

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

  const alternativeWithRelations = alternative as AlternativeWithRelations

  return (
    <AlternativeProductForm
      mode="edit"
      alternativeId={alternativeWithRelations.id}
      defaultValues={{
        name: alternativeWithRelations.name,
        description: alternativeWithRelations.description,
        websiteUrl: alternativeWithRelations.websiteUrl,
        logoUrl: alternativeWithRelations.logoUrl,
        categoryIds: alternativeWithRelations.categories.map((category) => category.id),
        productIds: alternativeWithRelations.products.map((product) => product.id),
      }}
      categories={categories}
      products={products}
    />
  )
}
