import Link from "next/link"
import { auth } from "@clerk/nextjs/server"
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
import { redirect } from "next/navigation"
import { PlanType } from "@/lib/vendor/prisma/client"
import { Badge } from "@/components/atoms/badge"
import { Button } from "@/components/atoms/button"
import { getActiveUserByClerkId } from "@/lib/server/userStatus"
import { buildPageMetadata } from "@/lib/metadata"
import {
  MEMBER_ORGANIZATIONS_ADD_PATH,
  MEMBER_ORGANIZATIONS_PATH,
} from "@/lib/routes"

export const metadata = buildPageMetadata({
  title: "Organizations",
  description: "Manage your organizations.",
})

type OrgPlan = {
  id: string
  name: string
  description?: string | null
  price: number
  discount?: number | null
  priceSuffix?: string | null
  features: Array<{ id: string; name: string; enabled: boolean }>
  externalId?: string | null
}

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

async function loadEligibleOrgPlans(): Promise<OrgPlan[]> {
  const plans = await getPublicPlans({
    type: PlanType.recurring_price,
  }).catch(() => [] as any[])
  return plans.filter((p: any) =>
    (p.features || []).some((f: any) => f.enabled && f.key === "organization"),
  )
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
    redirect(MEMBER_ORGANIZATIONS_PATH)
  }

  // Handle subscription-based redirects: status=active&subscription_id=...
  if (subscriptionId && status) {
    await validateOrgSubscriptionAction(subscriptionId, status)
    redirect(MEMBER_ORGANIZATIONS_PATH)
  }

  const hasOrgs = await memberHasFeature("organization")
  if (!hasOrgs) {
    const eligiblePlans = await loadEligibleOrgPlans()

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
              Unlock shared workspaces, role-aware access, and billing oversight
              built for teams that scale with Shipyard.
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
                    description:
                      "Control permissions with clarity across every workspace.",
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
                  <h2 className="text-lg font-semibold text-foreground">
                    Choose your plan
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-xl">
                    Billing updates instantly after checkout—no support tickets
                    or manual enablement.
                  </p>
                </div>

                <OrganizationPlanOptions
                  eligiblePlans={eligiblePlans}
                  fullWidth
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    )
  }
  const [{ userId: clerkId }, pageData] = await Promise.all([
    auth(),
    getMyOrganizationsPage(params),
  ])
  const currentUser = clerkId ? await getActiveUserByClerkId(clerkId) : null
  const { rows, total, limit } = pageData
  const perPage = Math.max(1, parseInt(String(limit || 10), 10) || 10)
  const pageCount = Math.max(1, Math.ceil(total / perPage))

  const ownsOrganization = rows.some(
    (org) => currentUser && org.ownerUserId === currentUser.id,
  )

  const shouldShowUpsell = !ownsOrganization
  const eligiblePlans = shouldShowUpsell ? await loadEligibleOrgPlans() : []

  return (
    <PageContainer>
      <div className="space-y-6 py-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Organizations
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Manage shared spaces, member roles, and billing for every crew
              operating inside Shipyard.
            </p>
          </div>
          <Button asChild size="sm" className="px-4">
            <Link href={MEMBER_ORGANIZATIONS_ADD_PATH}>New organization</Link>
          </Button>
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

        {shouldShowUpsell ? (
          <OrganizationPlanOptions eligiblePlans={eligiblePlans} />
        ) : null}
      </div>
    </PageContainer>
  )
}

function OrganizationPlanOptions({
  eligiblePlans,
  fullWidth = false,
}: {
  eligiblePlans: OrgPlan[]
  fullWidth?: boolean
}) {
  if (!eligiblePlans.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-muted-foreground">
        Reach out to our team and we&apos;ll help tailor a plan that unlocks
        organizations for your account.
        <div className="mt-3">
          <Button asChild variant="outline" className="w-fit">
            <a href="mailto:support@shipyardhq.dev">Contact support</a>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`grid gap-4 ${fullWidth ? "sm:grid-cols-2" : "md:grid-cols-2"}`}
    >
      {eligiblePlans.map((plan) => {
        const priceCents = plan.price ?? 0
        const isFree = priceCents === 0
        const discountRaw = plan.discount ?? 0
        const discountPct = Math.min(Math.max(discountRaw, 0), 100)
        const hasDiscount = !isFree && discountPct > 0 && discountPct < 100
        const discountedCents = hasDiscount
          ? Math.round(priceCents * (1 - discountPct / 100))
          : priceCents
        const displayPrice = isFree ? "Free" : USD.format(discountedCents / 100)
        const originalPrice = hasDiscount ? USD.format(priceCents / 100) : null
        const formattedDiscount = hasDiscount
          ? new Intl.NumberFormat("en-US", {
              maximumFractionDigits: 2,
            }).format(discountPct)
          : null

        return (
          <div
            key={plan.id}
            className="space-y-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  {plan.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {plan.description ||
                    "Includes all core Shipyard features plus organizations."}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 text-right">
                {hasDiscount && originalPrice ? (
                  <span className="text-xs text-muted-foreground line-through">
                    {originalPrice}
                  </span>
                ) : null}
                <div className="flex items-baseline gap-1 text-foreground">
                  <span className="text-sm font-semibold text-foreground">
                    {displayPrice}
                  </span>
                  {!isFree && plan.priceSuffix ? (
                    <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      {plan.priceSuffix}
                    </span>
                  ) : null}
                </div>
                {hasDiscount && formattedDiscount ? (
                  <span className="inline-flex w-fit items-center rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    Save {formattedDiscount}%
                  </span>
                ) : null}
              </div>
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              {plan.features
                .filter((f) => f.enabled)
                .map((feature) => (
                  <li key={feature.id} className="flex items-start gap-2">
                    <span className="mt-1 h-1 w-1 rounded-full bg-muted-foreground/60" />
                    <span>{feature.name}</span>
                  </li>
                ))}
            </ul>
            <div>
              <form action={startOrgCheckoutAction} className="flex">
                <input type="hidden" name="planId" value={plan.id} />
                <Button type="submit" className="px-6">
                  {plan.price > 0 ? "Buy now" : "Get access"}
                </Button>
              </form>
            </div>
          </div>
        )
      })}
    </div>
  )
}
