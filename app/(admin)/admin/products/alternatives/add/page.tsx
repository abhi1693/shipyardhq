import { AlternativeProductForm } from "../_components/AlternativeProductForm"
import { getCategories } from "@/actions/admin/categories/actions"
import { getProducts } from "@/actions/admin/products/actions"

export default async function AddAlternativeProductPage() {
  const [categories, products] = await Promise.all([
    getCategories({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    getProducts({
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
  ])

  return (
    <AlternativeProductForm
      mode="create"
      categories={categories}
      products={products}
    />
  )
}
