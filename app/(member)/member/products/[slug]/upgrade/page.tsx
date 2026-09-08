import { auth } from "@clerk/nextjs/server"

import { redirect } from "next/navigation"

import { getPublicPlans } from "@/actions/public/plans/actions"
import { requireManageableProduct } from "@/lib/server/productAccess"
import {
  memberProductPath,
  memberProductUpgradePath,
  memberProductsStatusPath,
  productPath,
} from "@/lib/routes"
import {
  ProductUpgradeProvisioning,
  type ProductUpgradePerformanceSnapshot,
} from "@/components/templates/member/products/ProductUpgradeProvisioning"
import prisma from "@/lib/prisma"
import { resolveEffectivePlanGrant } from "@/lib/products/effective-plan-grants"
import { getAnalyticsReportingWindow } from "@/lib/analytics/reportingWindow"

function getTrafficWindowStart() {
  return getAnalyticsReportingWindow().start
}

async function getPerformanceSnapshot(
  productId: string,
): Promise<ProductUpgradePerformanceSnapshot> {
  const since = getTrafficWindowStart()

  const [productTraffic, siteTraffic, productAnalytics] = await Promise.all([
    prisma.productTrafficDaily.aggregate({
      where: {
        productId,
        date: { gte: since },
      },
      _sum: {
        pageViews: true,
        uniqueVisitors: true,
      },
    }),
    prisma.siteTrafficDaily.aggregate({
      where: {
        date: { gte: since },
      },
      _sum: {
        pageViews: true,
        uniqueVisitors: true,
      },
    }),
    prisma.productAnalytics.findUnique({
      where: { productId },
      select: { upvotes: true },
    }),
  ])

  return {
    siteVisitors: siteTraffic._sum.uniqueVisitors ?? 0,
    sitePageViews: siteTraffic._sum.pageViews ?? 0,
    productVisitors: productTraffic._sum.uniqueVisitors ?? 0,
    productPageViews: productTraffic._sum.pageViews ?? 0,
    productUpvotes: productAnalytics?.upvotes ?? 0,
  }
}

export default async function ProductUpgradePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  await auth.protect()

  const { slug } = await params

  if (!slug) {
    redirect(memberProductsStatusPath("invalid"))
  }

  const { product } = await requireManageableProduct(slug, {
    missingRedirect: memberProductsStatusPath("not-found"),
    unauthorizedRedirect: memberProductsStatusPath("unauthorized"),
  })

  const now = new Date()
  const [allPlans, productPlan, performanceSnapshot] = await Promise.all([
    getPublicPlans().catch(() => []),
    prisma.product.findUnique({
      where: { id: product.id },
      select: {
        status: true,
        pricingModel: true,
        planGrants: {
          where: {
            status: "active",
            startsAt: { lte: now },
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
          select: {
            id: true,
            source: true,
            startsAt: true,
            expiresAt: true,
            createdAt: true,
            externalSubscriptionId: true,
            plan: {
              select: {
                id: true,
                name: true,
                type: true,
                price: true,
                isDefault: true,
                boostForDays: true,
              },
            },
          },
        },
      },
    }),
    getPerformanceSnapshot(product.id),
  ])
  const activeGrant = resolveEffectivePlanGrant(productPlan?.planGrants ?? [])
  const currentPlan = activeGrant?.plan ?? null
  const currentPlanPublic =
    allPlans.find((plan) => plan.id === currentPlan?.id) ??
    allPlans.find((plan) => plan.isDefault) ??
    null
  const hasActivePaidSubscription = Boolean(
    activeGrant?.externalSubscriptionId &&
    currentPlan &&
    currentPlan.type === "recurring_price" &&
    !currentPlan.isDefault &&
    (currentPlan.price ?? 0) > 0,
  )
  const lockedPlanType =
    currentPlan && !currentPlan.isDefault && (currentPlan.price ?? 0) > 0
      ? currentPlan.type
      : null
  const checkoutReadyPlans = allPlans.filter(
    (plan) => (plan.price || 0) === 0 || Boolean(plan.externalId),
  )
  const upgradePlans =
    lockedPlanType && currentPlanPublic
      ? [currentPlanPublic]
      : checkoutReadyPlans
  const boostEndsAt =
    currentPlan &&
    !currentPlan.isDefault &&
    currentPlan.type !== "recurring_price" &&
    activeGrant?.expiresAt
      ? activeGrant.expiresAt.toISOString()
      : null

  const productHref = memberProductPath(product.slug)
  const productUpgradeHref = memberProductUpgradePath(product.slug)
  const publicProductHref = productPath(product.slug)
  const preferFreePlan = productPlan?.pricingModel === "free"

  return (
    <div className="px-4 py-8 md:px-8">
      <div className="mx-auto w-full max-w-[1100px]">
        <ProductUpgradeProvisioning
          plans={upgradePlans}
          productId={product.id}
          redirectPath={productHref}
          errorRedirectPath={productUpgradeHref}
          currentPlanId={currentPlanPublic?.id}
          currentPlan={currentPlanPublic}
          productStatus={productPlan?.status ?? null}
          preferFreePlan={preferFreePlan}
          lockedPlanType={lockedPlanType}
          subscriptionLocked={hasActivePaidSubscription}
          currentPlanStatus={{
            hasActiveSubscription: hasActivePaidSubscription,
            assignedAt: activeGrant?.startsAt.toISOString() ?? null,
            boostEndsAt,
          }}
          productPublicPath={publicProductHref}
          performanceSnapshot={performanceSnapshot}
        />
      </div>
    </div>
  )
}
