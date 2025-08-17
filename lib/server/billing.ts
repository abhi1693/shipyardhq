"use server"

import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import { dodoClient } from "@/lib/dodo"
import { fetchDodoCustomerByEmail } from "@/lib/fetchDodoCustomer"

export async function syncCurrentUserBilling() {
  const { userId } = await auth()
  if (!userId) return { error: "Unauthenticated" }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, email: true },
  })
  if (!user?.email) return { error: "User not found" }

  const customer = await fetchDodoCustomerByEmail(user.email)
  if (!customer) {
    // No external customer found; avoid destructive deletes to prevent
    // accidentally revoking valid entitlements due to email mismatch.
    return { added: 0, removed: 0 }
  }

  const page = await dodoClient.subscriptions.list({
    customer_id: customer.customer_id,
    page_size: 100,
  } as any)

  const activeProducts = new Set<string>()
  const cancelledProducts = new Set<string>()
  const items: any[] = (page as any)?.items || []
  for (const sub of items) {
    const status = (sub?.status || "").toLowerCase()
    const pid = sub?.product_id as string | undefined
    if (!pid) continue
    if (status === "active") activeProducts.add(pid)
    if (status === "cancelled" || status === "expired" || status === "failed") {
      cancelledProducts.add(pid)
    }
  }

  // Also consider successful one-time payments as entitlements
  const payPage = await dodoClient.payments.list({
    customer_id: customer.customer_id,
    status: "succeeded",
    page_size: 100,
  } as any)
  const oneTimeProducts = new Set<string>()
  const payments: any[] = (payPage as any)?.items || []
  for (const p of payments) {
    const cart = (p?.product_cart as any[]) || []
    for (const it of cart) {
      const pid = it?.product_id as string | undefined
      if (pid) oneTimeProducts.add(pid)
    }
  }

  const plans = await prisma.plan.findMany({
    where: {
      externalId: {
        in: Array.from(
          new Set([
            ...activeProducts,
            ...cancelledProducts,
            ...oneTimeProducts,
          ]),
        ),
      },
    },
    select: { id: true, externalId: true },
  })
  const byExternal: Record<string, string> = {}
  for (const p of plans) if (p.externalId) byExternal[p.externalId] = p.id

  let added = 0
  for (const pid of new Set<string>([...activeProducts, ...oneTimeProducts])) {
    const planId = byExternal[pid]
    if (!planId) continue
    await prisma.userPlanPurchase.upsert({
      where: { userId_planId: { userId: user.id, planId } },
      update: {},
      create: { userId: user.id, planId, externalId: undefined },
    })
    added++
  }

  // Only remove entitlements for products that are cancelled AND not otherwise
  // protected by an active subscription or successful one-time payment.
  const protectedPids = new Set<string>([...activeProducts, ...oneTimeProducts])
  const removablePids = Array.from(cancelledProducts).filter(
    (pid) => !protectedPids.has(pid),
  )
  const removed = await prisma.userPlanPurchase.deleteMany({
    where: {
      userId: user.id,
      plan: { externalId: { in: removablePids } },
    },
  })

  return { added, removed: removed.count }
}
