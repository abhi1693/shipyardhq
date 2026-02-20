import { notFound } from "next/navigation"
import EditProductForm from "./form"
import { requireManageableProduct } from "@/lib/server/productAccess"
import {
  getAlternativeOptionsServer,
  getCategoryOptionsServer,
  getMemberProductConnectorServer,
} from "@/lib/server/generated-member"
import {
  getMemberProductForEditWizard,
  resetMemberProductConnector,
  updateMemberProduct,
} from "@/lib/server/member-product-actions"

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

  const product = await getMemberProductForEditWizard(summary.id)
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
      onUpdateProduct={updateMemberProduct}
      onResetConnector={resetMemberProductConnector}
    />
  )
}
