import { Metadata } from "next"
import { getPlanFeatures } from "@/actions/admin/plans/features/actions"
import { columns } from "./columns"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"

export const metadata: Metadata = {
  title: "Plan Features",
  description: "Manage feature flags for pricing plans",
}

export default async function PlanFeatureListPage() {
  const features = await getPlanFeatures()

  return (
    <ListPageWrapper title="Plan Features" addLink="/admin/plans/features/add">
      <EntityList columns={columns} data={features} pageCount={10} />
    </ListPageWrapper>
  )
}
