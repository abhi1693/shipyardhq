import { Metadata } from "next"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { columns, type MemberOrgRow } from "./columns"
import { getMyOrganizationsPage } from "@/actions/member/organizations/actions"
import { memberHasFeature } from "@/lib/memberFeatures"
import PageContainer from "@/components/layout/page-container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card"
import { getPublicPlans } from "@/actions/public/plans/actions"
import { validateOrgPaymentAction, startOrgCheckoutAction, validateOrgSubscriptionAction } from "@/actions/member/organizations/upsell"
import { OrgPlanBuyButton } from "@/components/molecules/OrgPlanBuyButton"
import { redirect } from "next/navigation"

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
    const plans = await getPublicPlans().catch(() => [] as any[])
    const eligiblePlans = plans.filter((p: any) =>
      (p.features || []).some((f: any) => f.enabled && f.key === "organization"),
    )

    return (
      <PageContainer>
        <div className="mx-auto w-full max-w-4xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Organizations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Unlock Organizations to collaborate with your team and manage members.
                Choose a plan below to buy access. Organization features unlock automatically
                after successful checkout.
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {eligiblePlans.map((p: any) => (
              <Card key={p.id}>
                <CardHeader>
                  <CardTitle className="flex items-baseline justify-between text-lg">
                    <span>{p.name}</span>
                    <span className="text-sm font-normal text-muted-foreground">
                      {(p.price > 0 ? `$${(p.price / 100).toFixed(2)}` : "Free")}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <ul className="list-inside list-disc text-sm text-muted-foreground">
                      {(p.features || []).filter((f: any) => f.enabled).map((f: any) => (
                        <li key={f.id}>{f.name}</li>
                      ))}
                    </ul>
                    {p.externalId && (p.price || 0) > 0 ? (
                      <OrgPlanBuyButton externalId={p.externalId} />
                    ) : (
                      <form action={startOrgCheckoutAction}>
                        <input type="hidden" name="planId" value={p.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                        >
                          Buy Now
                        </button>
                      </form>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {!eligiblePlans.length && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">No eligible plans found</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    We couldn’t find any plans with the organization feature.
                    Please check back later.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </PageContainer>
    )
  }
  const { rows, total, limit } = await getMyOrganizationsPage(params)
  const perPage = Math.max(1, parseInt(String(limit || 10), 10) || 10)
  const pageCount = Math.max(1, Math.ceil(total / perPage))

  return (
    <ListPageWrapper title="Organizations" addLink="/member/organizations/add">
      <EntityList
        columns={columns}
        data={rows as unknown as MemberOrgRow[]}
        pageCount={pageCount}
      />
    </ListPageWrapper>
  )
}
