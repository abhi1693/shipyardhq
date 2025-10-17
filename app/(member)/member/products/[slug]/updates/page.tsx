import { notFound } from "next/navigation"

import prisma from "@/lib/prisma"
import { requireManageableProduct } from "@/lib/server/productAccess"
import { getProductUpdatesForManage } from "@/actions/member/product-updates/actions"
import { ProductUpdatesManager } from "@/components/pages/ProductUpdatesManager"
import { productPath } from "@/lib/routes"

export default async function ProductUpdatesPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { product: manageableProduct } = await requireManageableProduct(slug, {
    unauthorizedRedirect: null,
    missingRedirect: null,
  })

  const [productRecord, updates] = await Promise.all([
    prisma.product.findUnique({
      where: { id: manageableProduct.id },
      select: {
        id: true,
        slug: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    getProductUpdatesForManage(slug),
  ])

  if (!productRecord) {
    return notFound()
  }

  return (
    <ProductUpdatesManager
      product={{
        id: productRecord.id,
        slug: productRecord.slug,
        name: productRecord.name,
        createdAt: productRecord.createdAt.toISOString(),
        updatedAt: productRecord.updatedAt.toISOString(),
        publicPath: productPath(productRecord.slug),
      }}
      initialUpdates={updates}
    />
  )
}
