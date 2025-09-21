import {auth} from "@clerk/nextjs/server"
import {notFound, redirect} from "next/navigation"

import prisma from "@/lib/prisma"
import {getActiveUserByClerkId} from "@/lib/server/userStatus"
import {PlanType} from "@/lib/vendor/prisma/client"

export type ManageableProductSummary = {
  id: string
  name: string
  slug: string
  userId: string
  organizationId: string | null
}

type ActiveUser = NonNullable<
  Awaited<ReturnType<typeof getActiveUserByClerkId>>
>

type RequireOptions = {
  unauthorizedRedirect?: string | null
  missingRedirect?: string | null
}

function handleMissing(redirectPath: string | null | undefined) {
  if (redirectPath === null) {
    notFound()
  }
  if (redirectPath) {
    redirect(redirectPath)
  }
  notFound()
}

function handleUnauthorized(redirectPath: string | null | undefined) {
  if (redirectPath === null) {
    notFound()
  }
  redirect(redirectPath ?? "/member/products?status=unauthorized")
}

export async function requireManageableProduct(
  slug: string,
  options: RequireOptions = {},
): Promise<{ product: ManageableProductSummary; currentUser: ActiveUser }> {
  const { unauthorizedRedirect, missingRedirect } = options

  const { userId: clerkId } = await auth()
  if (!clerkId) {
    handleUnauthorized(unauthorizedRedirect)
  }

  const currentUser = await getActiveUserByClerkId(clerkId!)
  if (!currentUser) {
    handleUnauthorized(unauthorizedRedirect)
  }

  const product = await prisma.product.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      userId: true,
      organizationId: true,
    },
  })

  if (!product) {
    handleMissing(missingRedirect)
  }

  let canManage = product!.userId === currentUser!.id

  if (!canManage && product!.organizationId) {
    try {
      const [membership, subscriptionAccess] = await Promise.all([
        prisma.organizationMembership.findFirst({
          where: {
            organizationId: product!.organizationId,
            userId: currentUser!.id,
          },
          select: { id: true },
        }),
        resolveOrganizationSubscriptionAccess(currentUser!.id, product!.organizationId),
      ])
      canManage = Boolean(membership || subscriptionAccess)
    } catch (error) {
      console.error("[productAccess] membership check failed", error)
      canManage = false
    }
  }

  if (!canManage) {
    handleUnauthorized(unauthorizedRedirect)
  }

  return {
    product: product!,
    currentUser: currentUser!,
  }
}

async function resolveOrganizationSubscriptionAccess(
  userId: string,
  organizationId: string,
): Promise<boolean> {
  try {
    const [org, qualifyingPurchase] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: { ownerUserId: true },
      }),
      prisma.userPlanPurchase.findFirst({
        where: {
          userId,
          plan: {
            type: PlanType.recurring_price,
            AND: [
              {
                assignments: {
                  some: {
                    enabled: true,
                    feature: { key: "organization" },
                  },
                },
              },
              {
                assignments: {
                  some: {
                    enabled: true,
                    feature: { key: "analytics.advanced" },
                  },
                },
              },
            ],
          },
        },
        select: { id: true },
      }),
    ])

    if (!org || org.ownerUserId !== userId) return false
    return Boolean(qualifyingPurchase)
  } catch (error) {
    console.error(
      "[productAccess] subscription access check failed",
      error,
    )
    return false
  }
}
