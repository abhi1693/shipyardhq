import { notFound } from "next/navigation"
import { ObjectPageLayout } from "@/components/layout/object-view/page-layout"
import { getPlanById } from "@/actions/admin/plans/actions"
import { PlanFeatureRelationship } from "./relationships/features"
import { Prisma } from "@prisma/client"
import {
  formatBoolean,
  formatCurrency,
  linkify,
  placeholder,
  formatPercent,
} from "@/lib/ui/formatters"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { OverviewRow } from "@/components/layout/object-view/overview"

export default async function ViewPlanPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = await params

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
          label: "Price",
          value: plan.price === 0 ? "Free" : formatCurrency(plan.price),
        },

        {
          label: "Discount",
          value: plan.discount ? formatPercent(plan.discount) : placeholder(),
        },
        { label: "Default", value: formatBoolean(plan.isDefault) },
        { label: "Description", value: plan.description || placeholder() },
      ]}
      basePath="admin/plans"
      editable
      deletable
      relationships={
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PlanFeatureRelationship rows={plan.assignments} />
            {plan.externalId && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Dodo Payments</CardTitle>
                </CardHeader>
                <CardContent>
                  <OverviewRow label="External ID" value={plan.externalId} />
                  <OverviewRow
                    label="Edit"
                    value={linkify({
                      href: `https://app.dodopayments.com/products/edit?id=${plan.externalId}`,
                      isExternal: true,
                    })}
                  />
                  <OverviewRow
                    label="Preview"
                    value={linkify({
                      href: `https://app.dodopayments.com/products/preview/${plan.externalId}`,
                      isExternal: true,
                    })}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </>
      }
    />
  )
}
