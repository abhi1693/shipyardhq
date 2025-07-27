import { getAllAssignedBadges } from "@/actions/admin/badges/actions"
import { columns } from "./columns"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"

export default async function AssignedProductBadgesPage() {
  const assignments = await getAllAssignedBadges()

  return (
    <ListPageWrapper
      title="Assigned Product Badges"
      addLink="/admin/products/assignments/badges/add"
    >
      <EntityList columns={columns} data={assignments} />
    </ListPageWrapper>
  )
}
