import { notFound } from "next/navigation"
import { ObjectPageLayout } from "@/components/layout/object-view/page-layout"
import prisma from "@/lib/prisma"
import { formatBoolean, linkify } from "@/lib/ui/formatters"
import { adminPath } from "@/lib/routes"
import { INSIGHTS_PIPELINE_FEATURE_KEY } from "@/lib/constants"
import {
  formatInsightsUsage,
  parseInsightsUsageConfig,
} from "@/lib/productInsights/insightsUsage"

export default async function AssignedFeaturePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const assignment = await prisma.planFeatureAssignment.findUnique({
    where: { id },
    include: {
      plan: true,
      feature: true,
    },
  })

  if (!assignment) return notFound()

  const overview = [
    {
      label: "Feature",
      value: linkify({
        href: adminPath("plans", "features", assignment.feature.id),
        label: assignment.feature.name,
      }),
    },
    {
      label: "Plan",
      value: linkify({
        href: adminPath("plans", assignment.plan.id),
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
  ]

  if (assignment.feature.key === INSIGHTS_PIPELINE_FEATURE_KEY) {
    overview.push({
      label: "Usage policy",
      value: formatInsightsUsage(parseInsightsUsageConfig(assignment.config)),
    })
  }

  return (
    <ObjectPageLayout
      heading={{
        id: assignment.id,
        title: assignment.feature.name,
        slug: assignment.feature.key,
        createdAt: assignment.createdAt,
        updatedAt: assignment.updatedAt,
      }}
      overview={overview}
      basePath="admin/plans/assignments"
      editable
      deletable
    />
  )
}
