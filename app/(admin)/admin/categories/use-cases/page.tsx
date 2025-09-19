import { Metadata } from "next"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { columns } from "./columns"
import {
  getUseCases,
  getUseCasesCount,
} from "@/actions/admin/categories/actions"
import {
  resolvePagination,
  type PaginationSearchParams,
} from "@/lib/pagination"

export const metadata: Metadata = {
  title: "Use Cases",
  description: "Manage functional use-cases in the admin panel",
}

export default async function UseCasePage({
  searchParams,
}: {
  searchParams?: Promise<PaginationSearchParams>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const { pageSize, skip, take } = resolvePagination(resolvedSearchParams)

  const [useCases, totalUseCases] = await Promise.all([
    getUseCases({ skip, take }),
    getUseCasesCount(),
  ])

  const pageCount = Math.max(Math.ceil(totalUseCases / pageSize), 1)

  return (
    <ListPageWrapper
      title="Use Cases"
      addLink="/admin/categories/use-cases/add"
    >
      <EntityList columns={columns} data={useCases} pageCount={pageCount} />
    </ListPageWrapper>
  )
}
