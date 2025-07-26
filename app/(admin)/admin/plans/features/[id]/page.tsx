import { notFound } from "next/navigation"
import { ObjectPageLayout } from "@/components/layout/object-view/page-layout"
import { commaSeparated, linkify } from "@/lib/ui/formatters"
import { getPlanFeatureById } from "@/actions/admin/plans/features/actions"

export default async function PlanFeaturePage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = await params
  const feature = await getPlanFeatureById(id)
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
        {
          label: "Key",
          value: <span className="font-mono">{feature.key}</span>,
        },
        { label: "Description", value: feature.description },
        {
          label: "Assigned Plans",
          value: commaSeparated(
            feature.assignments.map((a) =>
              linkify({
                label: a.plan.name,
                href: `/admin/plans/${a.plan.id}`,
                subtext: a.isExperimental ? (
                  <span className="text-yellow-600 text-xs italic">
                    (experimental)
                  </span>
                ) : undefined,
              }),
            ),
          ),
        },
      ]}
      basePath="features"
      deletable={false}
      editable={false}
    />
  )
}
