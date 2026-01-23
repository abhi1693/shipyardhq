import prisma from "@/lib/prisma"
import { registerEventHandler } from "@/lib/server/events"

// Attach the default plan to products upon creation
registerEventHandler({
  event: "product.created",
  id: "plans.attach-default-plan",
  queue: "default",
  handler: async ({ productId }) => {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, planId: true },
      })
      if (!product) return
      if (product.planId) return // respect pre-set plan

      const defaultPlan = await prisma.plan.findFirst({
        where: { isDefault: true },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      })
      if (!defaultPlan) return

      await prisma.product.update({
        where: { id: productId },
        data: { planId: defaultPlan.id },
      })
    } catch (err) {
      console.error("Failed to attach default plan to product:", err)
    }
  },
})
