import { notFound, redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"

import PageContainer from "@/components/layout/page-container"
import {
  ProductAnalyticsView,
  rangeToDays,
} from "@/components/pages/ProductAnalyticsView"
import prisma from "@/lib/prisma"
import { ensureUrlHasSchema } from "@/lib/utils"
import { requireActiveUserOrRedirect } from "@/lib/server/userStatus"
import { getOrganizationTrafficSummary } from "@/lib/server/analytics/productTrafficSummary"
import { organizationHasAdvancedAnalytics } from "@/lib/server/analytics/organizationAccess"
import { MEMBER_ORGANIZATIONS_PATH, memberOrganizationPath } from "@/lib/routes"

export default async function OrganizationAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ range?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const rangeParam = sp?.range ?? null
  const rangeDays = rangeToDays(rangeParam)

  const { userId: clerkId } = await auth()
  if (!clerkId) {
    redirect(MEMBER_ORGANIZATIONS_PATH)
  }
  const currentUser = await requireActiveUserOrRedirect(clerkId)

  const membership = await prisma.organizationMembership.findFirst({
    where: { organizationId: id, userId: currentUser.id },
    select: { id: true },
  })
  if (!membership) {
    redirect(MEMBER_ORGANIZATIONS_PATH)
  }

  const [organization, products, hasAdvancedAnalytics] = await Promise.all([
    prisma.organization.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        url: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.product.findMany({
      where: { organizationId: id },
      select: {
        id: true,
        analytics: { select: { upvotes: true } },
      },
    }),
    organizationHasAdvancedAnalytics(id),
  ])

  if (!organization) {
    notFound()
  }

  if (!hasAdvancedAnalytics) {
    redirect(memberOrganizationPath(id))
  }

  type OrganizationProduct = (typeof products)[number]
  const productIds = products.map((product: OrganizationProduct) => product.id)
  const aggregatedAnalytics = products.reduce(
    (acc: { upvotes: number }, product: OrganizationProduct) => {
      acc.upvotes += product.analytics?.upvotes ?? 0
      return acc
    },
    { upvotes: 0 },
  )

  const summary = await getOrganizationTrafficSummary(id, {
    rangeDays,
    includeAdvanced: true,
    productIds,
  })

  const publicHref = organization.url
    ? ensureUrlHasSchema(organization.url)
    : undefined

  return (
    <PageContainer>
      <ProductAnalyticsView
        product={{
          id: organization.id,
          slug: organization.id,
          name: organization.name,
          createdAt: organization.createdAt,
          updatedAt: organization.updatedAt,
          analytics: aggregatedAnalytics,
        }}
        summary={summary}
        basePath={MEMBER_ORGANIZATIONS_PATH.slice(1)}
        backHref={memberOrganizationPath(organization.id)}
        backLabel="Back to organization"
        publicHref={publicHref}
        publicLabel="Visit organization site"
        headingId={organization.id}
        headingSlug={organization.id}
        accessLevel="advanced"
      />
    </PageContainer>
  )
}
