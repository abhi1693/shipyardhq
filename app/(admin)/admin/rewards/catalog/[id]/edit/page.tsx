import { notFound } from "next/navigation"

import CatalogForm from "../../form"
import { buildPageMetadata } from "@/lib/metadata"
import { getRewardCatalogItemById } from "@/actions/admin/rewards/actions"
import { getPlanFeatures } from "@/actions/admin/plans/features/actions"

export const metadata = buildPageMetadata({
  title: "Edit reward catalog item",
  section: "Admin",
})

export default async function CatalogEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const item = await getRewardCatalogItemById(id)
  if (!item) {
    notFound()
  }

  const planFeatures = await getPlanFeatures({
    select: { key: true, name: true },
    orderBy: { name: "asc" },
  })

  return (
    <CatalogForm
      mode="edit"
      item={item}
      planFeatureOptions={planFeatures.map((feature) => ({
        key: feature.key,
        name: feature.name,
      }))}
    />
  )
}
