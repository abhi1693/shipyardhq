import { notFound } from "next/navigation"
import { getProductById } from "@/actions/admin/products/actions"
import { getCategories } from "@/actions/admin/categories/actions"
import { getUsers } from "@/actions/admin/users/actions"
import { getOrganizations } from "@/actions/admin/organizations/actions"
import EditProductForm from "./form"

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [product, categories, users, organizations] = await Promise.all([
    getProductById(id),
    getCategories({ select: { id: true, name: true } }),
    getUsers({
      select: { id: true, email: true, firstName: true, lastName: true },
    }),
    getOrganizations({ select: { id: true, name: true } }),
  ])

  if (!product) return notFound()

  const connectorConfig = product.paymentConnector?.config as
    | { accountId?: string; brandId?: string }
    | undefined
  const connector = product.paymentConnector
    ? {
        id: product.paymentConnector.id,
        provider: product.paymentConnector.provider,
        status: product.paymentConnector.status,
        lastSyncedAt: product.paymentConnector.lastSyncedAt,
        lastSyncError: product.paymentConnector.lastSyncError,
        keyHint: product.paymentConnector.credentials?.[0]?.keyHint ?? null,
        accountId:
          typeof connectorConfig?.accountId === "string"
            ? connectorConfig.accountId
            : null,
        brandId:
          typeof connectorConfig?.brandId === "string"
            ? connectorConfig.brandId
            : null,
      }
    : null

  return (
    <EditProductForm
      product={product}
      categories={categories}
      users={users}
      organizations={organizations}
      connector={connector}
    />
  )
}
