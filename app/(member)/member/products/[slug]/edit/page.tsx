import { notFound } from "next/navigation"
import { getCategories } from "@/actions/admin/categories/actions"
import EditProductForm from "./form"
import { getProductById } from "@/actions/admin/products/actions"
import { getMyOrganizations } from "@/actions/member/organizations/actions"
import { memberHasFeature } from "@/lib/memberFeatures"
import { requireManageableProduct } from "@/lib/server/productAccess"

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

  const product = await getProductById(summary.id)
  if (!product) return notFound()

  const [categories, organizations] = await Promise.all([
    getCategories(),
    getMyOrganizations().catch(() => []),
  ])

  const canEditCTA = await memberHasFeature("customCTA")

  return (
    <EditProductForm
      product={product}
      categories={categories}
      organizations={organizations}
      canEditCTA={canEditCTA}
    />
  )
}
