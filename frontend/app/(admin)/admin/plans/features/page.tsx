import {
  getPlanFeatures,
  getPlanFeaturesCount,
} from "@/actions/admin/plans/features/actions"
import { columns, PlanFeatureWithAssignments } from "./columns"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import {
  resolvePagination,
  type PaginationSearchParams,
} from "@/lib/pagination"
import { buildPageMetadata } from "@/lib/metadata"
import { adminPath } from "@/lib/routes"

export const metadata = buildPageMetadata({
  title: "Plan Features",
  section: "Admin",
  description: "Manage feature flags for pricing plans.",
})

export default async function PlanFeatureListPage({
  searchParams,
}: {
  searchParams?: Promise<PaginationSearchParams>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const { pageSize, skip, take } = resolvePagination(resolvedSearchParams)

  const [features, totalFeatures] = await Promise.all([
    getPlanFeatures({ skip, take }),
    getPlanFeaturesCount(),
  ])

  const typedFeatures = features as unknown as PlanFeatureWithAssignments[]

  const pageCount = Math.max(Math.ceil(totalFeatures / pageSize), 1)

  return (
    <ListPageWrapper
      title="Plan Features"
      addLink={adminPath("plans", "features", "add")}
    >
      <EntityList
        columns={columns}
        data={typedFeatures}
        pageCount={pageCount}
      />
    </ListPageWrapper>
  )
}
