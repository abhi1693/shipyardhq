import { addDays, startOfDay } from "date-fns"
import type { PrismaClient } from "@/lib/vendor/prisma/client"

export async function seedPageTraffic(prisma: PrismaClient) {
  // Skip if already seeded
  const existing = await prisma.pageTrafficDaily.count()
  if (existing > 0) return

  const today = startOfDay(new Date())
  const days = 14
  const baseViews = 800
  const baseVisitors = 320

  const rows = Array.from({ length: days }).map((_, i) => {
    const date = addDays(today, -i)
    const trend = Math.max(0, Math.round((days - i) * 12))
    const noise = (i % 5) * 7
    const pageViews = baseViews + trend + noise
    const visitors = baseVisitors + Math.round(trend * 0.4) + Math.round(noise * 0.6)

    return {
      date,
      pageViews,
      visitors,
      createdAt: date,
      updatedAt: date,
    }
  })

  await prisma.pageTrafficDaily.createMany({ data: rows })
}
