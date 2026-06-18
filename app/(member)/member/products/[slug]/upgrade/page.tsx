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
import PurchasePlanToast from "@/components/molecules/PurchasePlanToast"
import prisma from "@/lib/prisma"

function getTrafficWindowStart() {
  const start = new Date()
  start.setUTCHours(0, 0, 0, 0)
  start.setUTCDate(start.getUTCDate() - 30)
  return start
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
    siteUniqueVisitors30d: siteTraffic._sum.uniqueVisitors ?? 0,
    sitePageViews30d: siteTraffic._sum.pageViews ?? 0,
    productUniqueVisitors30d: productTraffic._sum.uniqueVisitors ?? 0,
    productPageViews30d: productTraffic._sum.pageViews ?? 0,
    productUpvotes: productAnalytics?.upvotes ?? 0,
  }
}

export default async function ProductUpgradePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  if (!slug) {
    redirect(memberProductsStatusPath("invalid"))
  }

  const { product } = await requireManageableProduct(slug, {
    missingRedirect: memberProductsStatusPath("not-found"),
    unauthorizedRedirect: memberProductsStatusPath("unauthorized"),
  })

  const [allPlans, productPlan, performanceSnapshot] = await Promise.all([
    getPublicPlans().catch(() => []),
    prisma.product.findUnique({
      where: { id: product.id },
      select: {
        subscriptionId: true,
        planAssignedAt: true,
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
    }),
    getPerformanceSnapshot(product.id),
  ])
  const currentPlan = productPlan?.plan ?? null
  const currentPlanPublic =
    allPlans.find((plan) => plan.id === currentPlan?.id) ?? null
  const hasActivePaidSubscription = Boolean(
    productPlan?.subscriptionId &&
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
    productPlan?.planAssignedAt &&
    (currentPlan.boostForDays ?? 0) > 0
      ? new Date(
          productPlan.planAssignedAt.getTime() +
            (currentPlan.boostForDays ?? 0) * 24 * 60 * 60 * 1000,
        ).toISOString()
      : null

  const productHref = memberProductPath(product.slug)
  const productUpgradeHref = memberProductUpgradePath(product.slug)
  const publicProductHref = productPath(product.slug)

  return (
    <div className="px-4 py-8 md:px-8">
      <PurchasePlanToast />
      <div className="mx-auto w-full max-w-[1100px]">
        <ProductUpgradeProvisioning
          plans={upgradePlans}
          productId={product.id}
          redirectPath={productHref}
          errorRedirectPath={productUpgradeHref}
          currentPlanId={currentPlan?.id}
          currentPlan={currentPlanPublic}
          lockedPlanType={lockedPlanType}
          subscriptionLocked={hasActivePaidSubscription}
          currentPlanStatus={{
            hasActiveSubscription: hasActivePaidSubscription,
            assignedAt: productPlan?.planAssignedAt?.toISOString() ?? null,
            boostEndsAt,
          }}
          productPublicPath={publicProductHref}
          performanceSnapshot={performanceSnapshot}
        />
      </div>
    </div>
  )
}
