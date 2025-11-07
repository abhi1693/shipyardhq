import { PrismaClient } from "@/lib/vendor/prisma/client"

const prisma = new PrismaClient()

const RANGE_START = new Date(Date.UTC(2025, 10, 3)) // Nov 3, 2025 00:00 UTC
const RANGE_END = new Date(Date.UTC(2025, 10, 7)) // Nov 7, 2025 00:00 UTC (exclusive)

const MIN_DELETE = 3
const MAX_DELETE = 10

function randomInt(min: number, max: number) {
  if (max < min) return min
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pickRandomSample<T>(items: T[], count: number) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, count)
}

async function main() {
  const events = await prisma.productTrafficEvent.findMany({
    where: {
      createdAt: {
        gte: RANGE_START,
        lt: RANGE_END,
      },
    },
    select: {
      id: true,
      productId: true,
    },
    orderBy: {
      productId: "asc",
    },
  })

  if (events.length === 0) {
    console.info("[traffic-prune] no events in range, exiting")
    return
  }

  const grouped = new Map<string, string[]>()
  for (const event of events) {
    const list = grouped.get(event.productId)
    if (list) {
      list.push(event.id)
    } else {
      grouped.set(event.productId, [event.id])
    }
  }

  let totalDeleted = 0

  for (const [productId, ids] of grouped.entries()) {
    const maxAllowed = Math.min(MAX_DELETE, ids.length)
    if (maxAllowed === 0) {
      continue
    }

    const minAllowed = Math.min(MIN_DELETE, maxAllowed)
    const deleteCount = randomInt(minAllowed, maxAllowed)
    if (deleteCount === 0) {
      continue
    }

    const toDelete = pickRandomSample(ids, deleteCount)
    const result = await prisma.productTrafficEvent.deleteMany({
      where: { id: { in: toDelete } },
    })

    totalDeleted += result.count
    console.info(
      `[traffic-prune] deleted ${result.count} events for product ${productId}`,
    )
  }

  console.info(
    `[traffic-prune] complete: deleted ${totalDeleted} events across ${grouped.size} products`,
  )
}

main()
  .catch((err) => {
    console.error("[traffic-prune] failed", err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
