import { Metadata } from "next"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { columns, type MemberOrgRow } from "./columns"
import { getMyOrganizationsPage } from "@/actions/member/organizations/actions"
import { memberHasFeature } from "@/lib/memberFeatures"
import PageContainer from "@/components/layout/page-container"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { getPublicPlans } from "@/actions/public/plans/actions"
import {
  validateOrgPaymentAction,
  startOrgCheckoutAction,
  validateOrgSubscriptionAction,
} from "@/actions/member/organizations/upsell"
import { OrgPlanBuyButton } from "@/components/molecules/OrgPlanBuyButton"
import { redirect } from "next/navigation"
import { PlanType } from "@/lib/vendor/prisma/client"
import { Anchor } from "lucide-react"

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

    if (!eligiblePlans.length) {
      return (
        <PageContainer>
          <div className="mx-auto w-full max-w-3xl">
            <section className="relative overflow-hidden rounded-3xl border border-sky-900/60 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-10 py-16 text-sky-100 shadow-2xl">
              <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute -left-20 top-0 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl" />
                <div className="absolute right-[-60px] top-24 h-48 w-48 rounded-full bg-blue-400/30 blur-2xl" />
                <div className="absolute inset-x-0 bottom-0 h-40 translate-y-1/2 bg-[radial-gradient(circle_at_bottom,_rgba(56,189,248,0.35)_0%,_transparent_65%)]" />
              </div>
              <div className="flex flex-col items-center gap-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-sky-500/40 bg-slate-950/50 shadow-lg">
                  <Anchor aria-hidden className="h-8 w-8 text-sky-300" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl font-semibold tracking-tight text-sky-50">
                    Organizations are charting new waters
                  </h1>
                  <p className="text-base text-sky-100/80">
                    Our crew is crafting a plan that unlocks organizations with a nautical flair. Sit tight - we'll hoist the sails soon.
                  </p>
                </div>
                <div className="flex flex-col items-center gap-4 text-sm text-sky-100/70">
                  <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/40 bg-slate-950/40 px-4 py-2">
                    <span className="h-2 w-2 rounded-full bg-sky-400" />
                    Coming soon to member organizations
                  </span>
                  <p className="max-w-md">
                    Keep your crew ready. We'll message you inside Shipyard the moment the new plans drop.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </PageContainer>
      )
    }

    return (
      <PageContainer>
        <div className="mx-auto w-full max-w-4xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Organizations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Unlock Organizations to run your crew and manage members. Choose
                a plan below to get access. Organization features unlock
                automatically after successful checkout.
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
                      {p.price > 0 ? `$${(p.price / 100).toFixed(2)}` : "Free"}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <ul className="list-inside list-disc text-sm text-muted-foreground">
                      {(p.features || [])
                        .filter((f: any) => f.enabled)
                        .map((f: any) => (
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
                          Get Access
                        </button>
                      </form>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
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
