import { notFound } from "next/navigation"
import { ObjectPageLayout } from "@/components/layout/object-view/page-layout"
import { getPlanById } from "@/actions/admin/plans/actions"
import { PlanFeatureRelationship } from "./relationships/features"
import { Prisma } from "@/lib/vendor/prisma/client"
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
  params: Promise<{ id: string }>
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
      overview={(() => {
        const p: any = plan
        const parts = [
          { label: "Type", value: plan.type },
          {
            label: "Price",
            value:
              plan.price === 0
                ? "Free"
                : (() => {
                    const base = formatCurrency(plan.price)
                    if (
                      p.type === "recurring_price" &&
                      p.paymentFrequencyInterval
                    ) {
                      const c = p.paymentFrequencyCount ?? 1
                      const i = String(p.paymentFrequencyInterval)
                      const human = c === 1 ? i : `${c} ${i}s`
                      return (
                        <span className="text-sm text-muted-foreground">
                          {base} <span>/ {human}</span>
                        </span>
                      )
                    }
                    return base
                  })(),
          },
          {
            label: "Boost For",
            value: `${(p as any).boostForDays ?? 1} day(s)`,
          },
          {
            label: "Discount",
            value: plan.discount ? formatPercent(plan.discount) : placeholder(),
          },
          { label: "Default", value: formatBoolean(plan.isDefault) },
          { label: "Description", value: plan.description || placeholder() },
        ]

        if (p.type === "recurring_price") {
          parts.push(
            {
              label: "Payment Frequency",
              value: p.paymentFrequencyInterval
                ? `${p.paymentFrequencyCount ?? 1} ${String(p.paymentFrequencyInterval)}${
                    (p.paymentFrequencyCount ?? 1) > 1 ? "s" : ""
                  }`
                : placeholder(),
            },
            {
              label: "Subscription Period",
              value: p.subscriptionPeriodInterval
                ? `${p.subscriptionPeriodCount ?? 1} ${String(p.subscriptionPeriodInterval)}${
                    (p.subscriptionPeriodCount ?? 1) > 1 ? "s" : ""
                  }`
                : placeholder(),
            },
          )
        }

        return parts
      })()}
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
