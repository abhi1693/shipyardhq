import { notFound } from "next/navigation"
import { ObjectPageLayout } from "@/components/layout/object-view/page-layout"
import prisma from "@/lib/prisma"
import { formatBoolean, linkify } from "@/lib/ui/formatters"

export default async function AssignedFeaturePage({
  params,
}: {
  params: { id: string }
}) {
  const assignment = await prisma.planFeatureAssignment.findUnique({
    where: { id: params.id },
    include: {
      plan: true,
      feature: true,
    },
  })

  if (!assignment) return notFound()

  return (
    <ObjectPageLayout
      heading={{
        id: assignment.id,
        title: assignment.feature.name,
        slug: assignment.feature.key,
        createdAt: assignment.createdAt,
        updatedAt: assignment.updatedAt,
      }}
      overview={[
        {
          label: "Feature",
          value: linkify({
            href: `/admin/features/${assignment.feature.id}`,
            label: assignment.feature.name,
          }),
        },
        {
          label: "Plan",
          value: linkify({
            href: `/admin/plans/${assignment.plan.id}`,
            label: assignment.plan.name,
          }),
        },
        {
          label: "Enabled",
          value: formatBoolean(assignment.enabled),
        },
        {
          label: "Experimental",
          value: formatBoolean(assignment.isExperimental),
        },
      ]}
      basePath="plans/assignments"
      editable
      deletable
    />
  )
}
