import prisma from "@/lib/prisma"
import { on } from "@/lib/server/events"

const DAY_IN_MS = 24 * 60 * 60 * 1000
const DEFAULT_NEW_BADGE_DAYS = 1

type ProductBadgeContext = {
  createdAt: Date
  boostDays: number
}

async function getNewBadgeContext(productId: string): Promise<ProductBadgeContext | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      createdAt: true,
      plan: { select: { boostForDays: true } },
    },
  })
  if (!product) return null

  let boostDays = product.plan?.boostForDays ?? null
  if (boostDays == null) {
    const defaultPlan = await prisma.plan.findFirst({
      where: { isDefault: true },
      orderBy: { createdAt: "desc" },
      select: { boostForDays: true },
    })
    boostDays = defaultPlan?.boostForDays ?? null
  }

  const resolvedBoost = boostDays ?? DEFAULT_NEW_BADGE_DAYS

  return {
    createdAt: product.createdAt,
    boostDays: resolvedBoost,
  }
}

function computeExpiry(anchor: Date, boostDays: number): Date | null {
  if (boostDays <= 0) return null
  return new Date(anchor.getTime() + boostDays * DAY_IN_MS)
}

// Auto-assign the "new" badge for newly created products
on("product.created", async ({ productId }) => {
  const badge = "new"

  try {
    const context = await getNewBadgeContext(productId)
    if (!context) return
    const expiresAt = computeExpiry(context.createdAt, context.boostDays)

    const existing = await prisma.productBadge.findFirst({
      where: { productId, badge },
    })

    if (existing) {
      // If already exists, leave as-is; optionally refresh expiry if missing
      if (!existing.expiresAt && expiresAt) {
        await prisma.productBadge.update({
          where: { id: existing.id },
          data: { expiresAt },
        })
      }
      return
    }

    await prisma.productBadge.create({
      data: { productId, badge, expiresAt },
    })
  } catch (err) {
    console.error("Failed to assign 'new' badge:", err)
  }
})

// Default behavior for manual badge assignments
on("badge.assigned", async ({ id, productId, badge, expiresAt }) => {
  try {
    // If an expiry was provided, respect it.
    if (expiresAt) return

    if (badge === "new") {
      const context = await getNewBadgeContext(productId)
      if (!context) return
      const computed = computeExpiry(new Date(), context.boostDays)
      if (!computed) return
      await prisma.productBadge.update({
        where: { id },
        data: { expiresAt: computed },
      })
      return
    }

    let ttlMs: number | null = null
    switch (badge) {
      case "featured":
        ttlMs = 7 * DAY_IN_MS // default 7 days
        break
      case "trending":
        ttlMs = DAY_IN_MS // 24 hours
        break
      case "editor-pick":
        ttlMs = null // no default expiry
        break
      default:
        ttlMs = null
    }

    if (ttlMs != null) {
      await prisma.productBadge.update({
        where: { id },
        data: { expiresAt: new Date(Date.now() + ttlMs) },
      })
    }
  } catch (err) {
    console.error("Failed to apply default expiry for badge:", badge, err)
  }
})

// Hooks for future behavior (examples)
on("product.updated", async ({ productId }) => {
  // Ensure "new" badge exists if product is within the boost window
  try {
    const context = await getNewBadgeContext(productId)
    if (!context) return
    const ageMs = Date.now() - context.createdAt.getTime()
    const boostWindowMs = context.boostDays * DAY_IN_MS
    if (context.boostDays > 0 && ageMs < boostWindowMs) {
      const existing = await prisma.productBadge.findFirst({
        where: { productId, badge: "new" },
      })
      if (!existing) {
        const expiresAt = computeExpiry(context.createdAt, context.boostDays)
        await prisma.productBadge.create({
          data: {
            productId,
            badge: "new",
            expiresAt,
          },
        })
      }
    }
  } catch (err) {
    console.error("product.updated listener failed:", err)
  }
})

on("product.deleted", async () => {
  // Badges cascade delete with Prisma relation, but we could log/metrics here.
})
