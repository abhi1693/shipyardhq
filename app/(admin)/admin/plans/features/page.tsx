import { Metadata } from "next"
import {
  getPlanFeatures,
  getPlanFeaturesCount,
} from "@/actions/admin/plans/features/actions"
import { columns, PlanFeatureWithAssignments } from "./columns"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { resolvePagination } from "@/lib/pagination"

export const metadata: Metadata = {
  title: "Plan Features",
  description: "Manage feature flags for pricing plans",
}

type SearchParams = {
  page?: string | string[]
  limit?: string | string[]
}

export default async function PlanFeatureListPage({
  searchParams,
}: {
  searchParams?: SearchParams
}) {
  const { pageSize, skip, take } = resolvePagination(searchParams)

  const [features, totalFeatures] = await Promise.all([
    getPlanFeatures({ skip, take }),
    getPlanFeaturesCount(),
  ])

  const typedFeatures = features as PlanFeatureWithAssignments[]

  const pageCount = Math.max(Math.ceil(totalFeatures / pageSize), 1)

  return (
    <ListPageWrapper title="Plan Features" addLink="/admin/plans/features/add">
      <EntityList
        columns={columns}
        data={typedFeatures}
        pageCount={pageCount}
      />
    </ListPageWrapper>
  )
}
