import { notFound } from "next/navigation"
import EditProductForm from "./form"
import { requireManageableProduct } from "@/lib/server/productAccess"
import {
  getAlternativeOptionsServer,
  getCategoryOptionsServer,
  getMemberProductConnectorServer,
} from "@/lib/server/generated-member"
import { getProductForEditWizard } from "@/lib/server/product-management"

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

  const [categories, alternatives, connector] = await Promise.all([
    getCategoryOptionsServer().catch(() => []),
    getAlternativeOptionsServer().catch(() => []),
    getMemberProductConnectorServer(String(product.id)).catch(() => null),
  ])

  return (
    <EditProductForm
      product={product}
      categories={categories}
      alternatives={alternatives}
      connector={connector}
    />
  )
}
