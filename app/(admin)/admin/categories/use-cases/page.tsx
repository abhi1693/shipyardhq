import { Metadata } from "next"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { columns } from "./columns"
import { getUseCases } from "@/actions/admin/categories/actions"

export const metadata: Metadata = {
  title: "Use Cases",
  description: "Manage functional use-cases in the admin panel",
}

export default async function UseCasePage() {
  const useCases = await getUseCases()

  return (
    <ListPageWrapper
      title="Use Cases"
      addLink="/admin/categories/use-cases/add"
    >
      <EntityList columns={columns} data={useCases} />
    </ListPageWrapper>
  )
}
