import { notFound } from "next/navigation"
import { getCategories } from "@/actions/admin/categories/actions"
import EditProductForm from "./form"
import { getProductForEditWizard } from "@/actions/admin/products/actions"
import { requireManageableProduct } from "@/lib/server/productAccess"
import { getAlternativeProducts } from "@/actions/admin/alternative-products/actions"

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { product: summary } = await requireManageableProduct(slug, {
    unauthorizedRedirect: null,
    missingRedirect: null,
  })

  const product = await getProductForEditWizard(summary.id)
  if (!product) return notFound()

  const [categories, alternatives] = await Promise.all([
    getCategories({ orderBy: { name: "asc" } }),
    getAlternativeProducts({
      select: { id: true, slug: true, name: true, websiteUrl: true },
      orderBy: { name: "asc" },
    }).catch(() => []),
  ])

  return (
    <EditProductForm
      product={product}
      categories={categories}
      alternatives={alternatives}
    />
  )
}
