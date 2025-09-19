import { Metadata } from "next"
import Link from "next/link"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { columns, type MemberOrgRow } from "./columns"
import { getMyOrganizationsPage } from "@/actions/member/organizations/actions"
import { memberHasFeature } from "@/lib/memberFeatures"
import PageContainer from "@/components/layout/page-container"
import { Card, CardContent } from "@/components/atoms/card"
import { getPublicPlans } from "@/actions/public/plans/actions"
import {
  validateOrgPaymentAction,
  startOrgCheckoutAction,
  validateOrgSubscriptionAction,
} from "@/actions/member/organizations/upsell"
import { OrgPlanBuyButton } from "@/components/molecules/OrgPlanBuyButton"
import { redirect } from "next/navigation"
import { PlanType } from "@/lib/vendor/prisma/client"
import { Badge } from "@/components/atoms/badge"
import { Button } from "@/components/atoms/button"

export const metadata: Metadata = {
  title: "Organizations",
  description: "Manage your organizations.",
}

export default async function MemberOrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const paymentId = (params["payment_id"] as string) || ""
  const status = (params["status"] as string) || ""
  const subscriptionId = (params["subscription_id"] as string) || ""

  if (paymentId && status) {
    await validateOrgPaymentAction(paymentId)
    redirect("/member/organizations")
  }

  // Handle subscription-based redirects: status=active&subscription_id=...
  if (subscriptionId && status) {
    await validateOrgSubscriptionAction(subscriptionId, status)
    redirect("/member/organizations")
  }

  const hasOrgs = await memberHasFeature("organization")
  if (!hasOrgs) {
    // Fetch eligible plans only; checkout happens at user/org level
    const plans = await getPublicPlans({
      type: PlanType.recurring_price,
    }).catch(() => [] as any[])
    const eligiblePlans = plans.filter((p: any) =>
      (p.features || []).some(
        (f: any) => f.enabled && f.key === "organization",
      ),
    )

    return (
      <PageContainer>
        <div className="mx-auto max-w-5xl space-y-8 py-12">
          <div className="space-y-2">
            <Badge
              variant="outline"
              className="uppercase tracking-[0.28em] text-[0.65rem] text-muted-foreground"
            >
              Organizations
            </Badge>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Coordinate every crew with dedicated organizations
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
              Unlock shared workspaces, role-aware access, and billing oversight built for teams
              that scale with Shipyard.
            </p>
          </div>

          <Card className="border border-transparent bg-white/90 shadow-none">
            <CardContent className="space-y-8 px-6 py-6 md:px-10">
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {[
                  {
                    title: "Centralized membership",
                    description:
                      "Assign owners, admins, and collaborators without leaving your command deck.",
                  },
                  {
                    title: "Role-aware access",
                    description: "Control permissions with clarity across every workspace.",
                  },
                  {
                    title: "Unified billing",
                    description:
                      "Track invoices and payment methods for each organization in one place.",
                  },
                ].map((feature) => (
                  <div
                    key={feature.title}
                    className="space-y-2 rounded-xl border border-slate-200 bg-white px-4 py-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      {feature.title}
                    </p>
                    <p className="text-sm leading-relaxed text-muted-foreground/90">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-foreground">Choose your plan</h2>
                  <p className="text-sm text-muted-foreground max-w-xl">
                    Billing updates instantly after checkout—no support tickets or manual enablement.
                  </p>
                </div>

                {eligiblePlans.length ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {eligiblePlans.map((p: any) => (
                      <div
                        key={p.id}
                        className="space-y-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-foreground">{p.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(p.description as string) ||
                                "Includes all core Shipyard features plus organizations."}
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-foreground">
                            {p.price > 0 ? `$${(p.price / 100).toFixed(2)}` : "Free"}
                          </span>
                        </div>
                        <ul className="space-y-2 text-xs text-muted-foreground">
                          {(p.features || [])
                            .filter((f: any) => f.enabled)
                            .map((f: any) => (
                              <li key={f.id} className="flex items-start gap-2">
                                <span className="mt-1 h-1 w-1 rounded-full bg-muted-foreground/60" />
                                <span>{f.name}</span>
                              </li>
                            ))}
                        </ul>
                        <div>
                          {p.externalId && (p.price || 0) > 0 ? (
                            <OrgPlanBuyButton externalId={p.externalId} />
                          ) : (
                            <form action={startOrgCheckoutAction} className="flex">
                              <input type="hidden" name="planId" value={p.id} />
                              <Button type="submit" className="px-6">
                                Get access
                              </Button>
                            </form>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-muted-foreground">
                    Reach out to our team and we&apos;ll help tailor a plan that unlocks organizations
                    for your account.
                    <div className="mt-3">
                      <Button asChild variant="outline" className="w-fit">
                        <a href="mailto:support@shipyardhq.com">Contact support</a>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    )
  }
  const { rows, total, limit } = await getMyOrganizationsPage(params)
  const perPage = Math.max(1, parseInt(String(limit || 10), 10) || 10)
  const pageCount = Math.max(1, Math.ceil(total / perPage))

  return (
    <PageContainer>
      <div className="space-y-6 py-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Organizations
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Manage shared spaces, member roles, and billing for every crew operating inside Shipyard.
            </p>
          </div>
          <Button asChild size="sm" className="px-4">
            <Link href="/member/organizations/add">New organization</Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Active organizations
            </p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{total}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Showing per page
            </p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{perPage}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Pages available
            </p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{pageCount}</p>
          </div>
        </div>

        <Card className="border border-transparent bg-white/90 shadow-none">
          <CardContent className="space-y-6 px-0">
            <EntityList
              columns={columns}
              data={rows as unknown as MemberOrgRow[]}
              pageCount={pageCount}
            />
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
