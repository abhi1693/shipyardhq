import { Metadata } from "next"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { columns } from "./columns"
import { getPlans } from "@/actions/admin/plans/actions"

export const metadata: Metadata = {
  title: "Plans",
  description: "Manage plans in the admin panel",
}

export default async function PlanPage() {
  const plans = await getPlans()

  return (
    <ListPageWrapper title="Plans" addLink="/admin/plans/add">
      <EntityList columns={columns} data={plans} />
    </ListPageWrapper>
  )
}
