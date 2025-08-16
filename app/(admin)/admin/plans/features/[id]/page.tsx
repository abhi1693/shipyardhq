import { notFound } from "next/navigation"
import { ObjectPageLayout } from "@/components/layout/object-view/page-layout"
import { getPlanFeatureById } from "@/actions/admin/plans/features/actions"
import { PlanAssignmentRelationship } from "./relationships/assignments"
import { Prisma } from "@prisma/client"

export default async function PlanFeaturePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const feature = (await getPlanFeatureById(
    id,
  )) as Prisma.PlanFeatureGetPayload<{
    include: {
      assignments: {
        include: {
          plan: {
            select: {
              id: true
              name: true
            }
          }
        }
      }
    }
  }>

  if (!feature) return notFound()

  return (
    <ObjectPageLayout
      heading={{
        id: feature.id,
        title: feature.name,
        createdAt: feature.createdAt,
        updatedAt: feature.updatedAt,
        slug: feature.key,
      }}
      overview={[
        { label: "Name", value: feature.name },
        { label: "Description", value: feature.description },
      ]}
      basePath="admin/plans/features"
      deletable
      editable
      relationships={<PlanAssignmentRelationship rows={feature.assignments} />}
    />
  )
}
