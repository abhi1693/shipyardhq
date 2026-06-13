import { redirect } from "next/navigation"

import { getPublicPlans } from "@/actions/public/plans/actions"
import { requireManageableProduct } from "@/lib/server/productAccess"
import {
  memberProductPath,
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
        plan: {
          select: {
            id: true,
            name: true,
            type: true,
            price: true,
            isDefault: true,
          },
        },
      },
    }),
    getPerformanceSnapshot(product.id),
  ])
  const currentPlan = productPlan?.plan ?? null
  const lockedPlanType =
    currentPlan && !currentPlan.isDefault && (currentPlan.price ?? 0) > 0
      ? currentPlan.type
      : null
  const upgradePlans = lockedPlanType
    ? allPlans.filter(
        (plan) => (plan.price || 0) === 0 || plan.type === lockedPlanType,
      )
    : allPlans

  const productHref = memberProductPath(product.slug)
  const publicProductHref = productPath(product.slug)

  return (
    <div className="px-4 py-8 md:px-8">
      <PurchasePlanToast />
      <div className="mx-auto w-full max-w-[1100px]">
        <ProductUpgradeProvisioning
          plans={upgradePlans}
          productId={product.id}
          redirectPath={productHref}
          currentPlanId={currentPlan?.id}
          lockedPlanType={lockedPlanType}
          productPublicPath={publicProductHref}
          performanceSnapshot={performanceSnapshot}
        />
      </div>
    </div>
  )
}
