import prisma from "@/lib/prisma"
import { dispatchEventAsync, registerEventHandler } from "@/lib/server/events"
import { APP_EVENTS } from "@/lib/server/events/constants"
import type { PageTrafficPayload } from "@/types/analytics"

type PageTrafficEventPayload = PageTrafficPayload & {
  __enqueuedAt?: Date
}

// Persist landing page traffic asynchronously so API callers return quickly.
registerEventHandler({
  event: APP_EVENTS.ANALYTICS_PAGE_TRAFFIC,
  id: "analytics.record-page-traffic",
  mode: "async",
  queue: "default",
  handler: async (payload: PageTrafficEventPayload) => {
    try {
      const createdAt = payload.__enqueuedAt
        ? new Date(payload.__enqueuedAt)
        : new Date()

      const dayKey = new Date(
        Date.UTC(
          createdAt.getUTCFullYear(),
          createdAt.getUTCMonth(),
          createdAt.getUTCDate(),
        ),
      )

      await prisma.pageTrafficDaily.upsert({
        where: { date: dayKey },
        create: { date: dayKey, pageViews: 1, visitors: 1 },
        update: {
          pageViews: { increment: 1 },
          visitors: { increment: 1 },
        },
      })
    } catch (err) {
      console.error("[analytics] failed to persist page traffic", err)
    }
  },
})

export async function trackPageTraffic(payload: PageTrafficPayload = {}) {
  dispatchEventAsync(APP_EVENTS.ANALYTICS_PAGE_TRAFFIC, payload, {
    context: {},
  })
}
