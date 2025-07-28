import { Metadata } from "next"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { columns } from "./columns"
import { getUseCaseAssignments } from "@/actions/admin/categories/actions"

export const metadata: Metadata = {
  title: "Use Case Assignments",
  description: "Map use cases to categories",
}

export default async function UseCaseAssignmentPage() {
  const assignments = await getUseCaseAssignments()

  return (
    <ListPageWrapper
      title="Use Case → Category"
      addLink="/admin/categories/use-cases/assignments/add"
    >
      <EntityList columns={columns} data={assignments} />
    </ListPageWrapper>
  )
}
