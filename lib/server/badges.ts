import prisma from "@/lib/prisma"
import { on } from "@/lib/server/events"

// Auto-assign the "new" badge for newly created products
on("product.created", async ({ productId }) => {
  const oneDay = 24 * 60 * 60 * 1000
  const expiresAt = new Date(Date.now() + oneDay)
  const badge = "new"

  try {
    const existing = await prisma.productBadge.findFirst({
      where: { productId, badge },
    })

    if (existing) {
      // If already exists, leave as-is; optionally refresh expiry if missing
      if (!existing.expiresAt) {
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
on("badge.assigned", async ({ id, badge, expiresAt }) => {
  try {
    // If an expiry was provided, respect it.
    if (expiresAt) return

    let ttlMs: number | null = null
    switch (badge) {
      case "new":
        ttlMs = 24 * 60 * 60 * 1000 // 1 day
        break
      case "featured":
        ttlMs = 7 * 24 * 60 * 60 * 1000 // default 7 days
        break
      case "trending":
        ttlMs = 24 * 60 * 60 * 1000 // 24 hours
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
  // Ensure "new" badge exists if product is within 1 day of creation
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { createdAt: true },
    })
    if (!product) return
    const ageMs = Date.now() - product.createdAt.getTime()
    const oneDay = 24 * 60 * 60 * 1000
    if (ageMs < oneDay) {
      const existing = await prisma.productBadge.findFirst({
        where: { productId, badge: "new" },
      })
      if (!existing) {
        await prisma.productBadge.create({
          data: {
            productId,
            badge: "new",
            expiresAt: new Date(product.createdAt.getTime() + oneDay),
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
