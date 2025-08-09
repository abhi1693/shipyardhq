import { Metadata } from "next"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { columns } from "./columns"
import { getUseCaseAssignments } from "@/actions/admin/categories/actions"

export const metadata: Metadata = {
  title: "Assigned Use Cases",
  description: "View all use-case to category assignments",
}

export default async function UseCaseAssignmentsPage() {
  const assignments = await getUseCaseAssignments()

  return (
    <ListPageWrapper
      title="Use Case Assignments"
      addLink="/admin/categories/use-cases/assignments/add"
    >
      <EntityList columns={columns} data={assignments} />
    </ListPageWrapper>
  )
}
