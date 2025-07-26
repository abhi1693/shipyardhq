import { notFound } from "next/navigation"
import { ObjectPageLayout } from "@/components/layout/object-view/page-layout"
import { getPlanById } from "@/actions/admin/plans/actions"
import { PlanFeatureRelationship } from "./relationships/features"
import { Prisma } from "@prisma/client"
import { formatBoolean, formatCurrency, placeholder } from "@/lib/ui/formatters"

export default async function ViewPlanPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params

  const plan = (await getPlanById(id, {
    include: {
      assignments: {
        include: {
          feature: true,
        },
      },
    },
  })) as Prisma.PlanGetPayload<{
    include: {
      assignments: {
        include: {
          feature: true
        }
      }
    }
  }>

  if (!plan) return notFound()

  return (
    <ObjectPageLayout
      heading={{
        id: plan.id,
        title: plan.name,
        slug: plan.slug,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
      }}
      overview={[
        { label: "Type", value: plan.type },
        {
          label: "Interval",
          value: `${plan.frequency} ${plan.interval}${plan.frequency > 1 ? "s" : ""}`,
        },
        {
          label: "Price",
          value: plan.price === 0 ? "Free" : formatCurrency(plan.price),
        },
        {
          label: "Trial Days",
          value: plan.trialDays ? `${plan.trialDays} day(s)` : placeholder(),
        },
        {
          label: "Discount",
          value: plan.discount ? formatCurrency(plan.discount) : placeholder(),
        },
        { label: "Default", value: formatBoolean(plan.isDefault) },
        { label: "Description", value: plan.description || placeholder() },
      ]}
      basePath="admin/plans"
      editable
      deletable
      relationships={<PlanFeatureRelationship rows={plan.assignments} />}
    />
  )
}
