import CatalogForm from "../form"
import { buildPageMetadata } from "@/lib/metadata"
import { getPlanFeatures } from "@/actions/admin/plans/features/actions"

export const metadata = buildPageMetadata({
  title: "Create reward catalog item",
  section: "Admin",
})

export default async function CatalogCreatePage() {
  const planFeatures = await getPlanFeatures({
    select: { key: true, name: true },
    orderBy: { name: "asc" },
  })

  return (
    <CatalogForm
      mode="create"
      planFeatureOptions={planFeatures.map((feature) => ({
        key: feature.key,
        name: feature.name,
      }))}
    />
  )
}
