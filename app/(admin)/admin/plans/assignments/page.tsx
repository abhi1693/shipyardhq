import { Metadata } from "next"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { columns } from "./columns"
import { getAssignedFeatures } from "@/actions/admin/plans/assignments/actions"

export const metadata: Metadata = {
  title: "Assigned Features",
  description: "View all plan-feature assignments",
}

export default async function AssignedFeaturePage() {
  const assignments = await getAssignedFeatures()

  return (
    <ListPageWrapper title="Assigned Features">
      <EntityList columns={columns} data={assignments} />
    </ListPageWrapper>
  )
}
