import {
  DeviceCategory,
  Prisma,
  PrismaClient,
} from "@/lib/vendor/prisma/client"

type BrowserProfile = {
  browser: string
  os: string
  userAgent: string
  device: DeviceCategory
  isBot?: boolean
}

type GeoVariant = {
  country: string
  region: string
  city: string
}

type ProductRecord = {
  id: string
  slug: string
}

const prisma = new PrismaClient()

const RANGE_START = new Date(Date.UTC(2025, 10, 3)) // Nov 3, 2025
const RANGE_END = new Date(Date.UTC(2025, 10, 6)) // Nov 6, 2025
const EVENTS_PER_DAY = 12

const BROWSER_PROFILES: BrowserProfile[] = [
  {
    browser: "Chrome",
    os: "Mac OS",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    device: "desktop",
  },
  {
    browser: "Safari",
    os: "Mac OS",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
    device: "desktop",
  },
  {
    browser: "Edge",
    os: "Windows",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
    device: "desktop",
  },
  {
    browser: "Firefox",
    os: "Windows",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0",
    device: "desktop",
  },
  {
    browser: "Chrome",
    os: "Android",
    userAgent:
      "Mozilla/5.0 (Linux; Android 15; Pixel 9 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
    device: "mobile",
  },
  {
    browser: "Arc",
    os: "Mac OS",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_1) AppleWebKit/537.36 (KHTML, like Gecko) Arc/1.36.0 Chrome/130.0.0.0 Safari/537.36",
    device: "desktop",
  },
  {
    browser: "DuckDuckGo",
    os: "Android",
    userAgent:
      "Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) DuckDuckGo/7 Chrome/130.0.0.0 Mobile Safari/537.36",
    device: "mobile",
  },
]

const GEO_VARIANTS: GeoVariant[] = [
  { country: "US", region: "CA", city: "San Francisco" },
  { country: "US", region: "NY", city: "New York" },
  { country: "CA", region: "ON", city: "Toronto" },
  { country: "GB", region: "ENG", city: "London" },
  { country: "DE", region: "BE", city: "Berlin" },
  { country: "SG", region: "SG", city: "Singapore" },
  { country: "IN", region: "KA", city: "Bengaluru" },
  { country: "IN", region: "MH", city: "Mumbai" },
  { country: "IN", region: "DL", city: "New Delhi" },
  { country: "BR", region: "SP", city: "Sao Paulo" },
  { country: "AU", region: "NSW", city: "Sydney" },
]

const REFERRERS: Array<string | null> = [null]

function enumerateDays(start: Date, endInclusive: Date) {
  const days: Date[] = []
  const cursor = new Date(start.getTime())
  while (cursor <= endInclusive) {
    days.push(new Date(cursor.getTime()))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return days
}

function slugSeed(slug: string) {
  return slug.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
}

function pickPath(slug: string) {
  return `/products/${slug}`
}

function buildEventsForDay(
  product: ProductRecord,
  day: Date,
  seedOffset: number,
): Prisma.ProductTrafficEventCreateManyInput[] {
  const events: Prisma.ProductTrafficEventCreateManyInput[] = []
  for (let i = 0; i < EVENTS_PER_DAY; i += 1) {
    const profile =
      BROWSER_PROFILES[(seedOffset + i) % BROWSER_PROFILES.length]
    const geo = GEO_VARIANTS[(seedOffset * 3 + i) % GEO_VARIANTS.length]
    const referrer = REFERRERS[(seedOffset + i) % REFERRERS.length]
    const hourOffset = (i % 12) * 2
    const minuteOffset = ((seedOffset + i) % 3) * 15
    const createdAt = new Date(day.getTime())
    createdAt.setUTCHours(hourOffset, minuteOffset, 0, 0)

    events.push({
      productId: product.id,
      path: pickPath(product.slug),
      referrer,
      userAgent: profile.userAgent,
      device: profile.device,
      browser: profile.browser,
      os: profile.os,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      ipHash: null,
      isBot: Boolean(profile.isBot),
      createdAt,
    })
  }
  return events
}

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, slug: true },
    orderBy: { createdAt: "asc" },
  })

  if (products.length === 0) {
    console.warn("[traffic-backfill] no products found, exiting")
    return
  }

  const days = enumerateDays(RANGE_START, RANGE_END)
  let totalCreated = 0

  for (const product of products) {
    const seed = slugSeed(product.slug)
    const data = days.flatMap((day, index) =>
      buildEventsForDay(product, day, seed + index),
    )

    if (data.length === 0) continue

    const result = await prisma.productTrafficEvent.createMany({
      data,
      skipDuplicates: true,
    })

    totalCreated += result.count
    console.info(
      `[traffic-backfill] inserted ${result.count} events for ${product.slug}`,
    )
  }

  console.info(
    `[traffic-backfill] complete: inserted ${totalCreated} events for ${products.length} products`,
  )
}

main()
  .catch((err) => {
    console.error("[traffic-backfill] failed", err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
