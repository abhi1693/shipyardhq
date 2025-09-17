import prisma from "@/lib/prisma"
import { sendEmail } from "@/lib/email/resend"
import DiscoverDigestEmail from "@/lib/email/templates/discover/digest"
import { getAppBaseUrl } from "@/lib/email/utils"

const LOOKBACK_DAYS = 7
const FRESH_LIMIT = 6
const TRENDING_LIMIT = 6

function subtractDays(date: Date, days: number) {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000)
}

function buildProductUrl(slug: string) {
  const base = getAppBaseUrl()
  return `${base}/products/${slug}`
}

function buildBrowseUrl() {
  const base = getAppBaseUrl()
  return `${base}/browse`
}

export async function sendDiscoverDigestEmails(now: Date = new Date()) {
  const weekEnd = now
  const weekStart = subtractDays(now, LOOKBACK_DAYS - 1)

  const [freshLaunches, trending, subscribers] = await Promise.all([
    prisma.product
      .findMany({
        where: {
          status: "published",
          publishedAt: { gte: subtractDays(now, LOOKBACK_DAYS) },
        },
        orderBy: { publishedAt: "desc" },
        take: FRESH_LIMIT,
        select: {
          name: true,
          slug: true,
          tagline: true,
          publishedAt: true,
          category: { select: { name: true } },
          analytics: { select: { upvotes: true, clicks: true } },
        },
      })
      .then((rows) =>
        rows.map((row) => ({
          name: row.name,
          tagline: row.tagline,
          url: buildProductUrl(row.slug),
          category: row.category?.name ?? null,
          upvotes: row.analytics?.upvotes ?? null,
          clicks: row.analytics?.clicks ?? null,
          publishedAt: row.publishedAt,
        })),
      ),
    prisma.product
      .findMany({
        where: {
          status: "published",
          publishedAt: { gte: subtractDays(now, 30) },
        },
        orderBy: { analytics: { upvotes: "desc" } },
        take: TRENDING_LIMIT,
        select: {
          name: true,
          slug: true,
          tagline: true,
          publishedAt: true,
          category: { select: { name: true } },
          analytics: { select: { upvotes: true, clicks: true } },
        },
      })
      .then((rows) =>
        rows.map((row) => ({
          name: row.name,
          tagline: row.tagline,
          url: buildProductUrl(row.slug),
          category: row.category?.name ?? null,
          upvotes: row.analytics?.upvotes ?? null,
          clicks: row.analytics?.clicks ?? null,
          publishedAt: row.publishedAt,
        })),
      ),
    prisma.newsletterSubscription.findMany({ select: { email: true } }),
  ])

  if (!subscribers.length) {
    return { sent: 0, skipped: 0 }
  }

  let sent = 0
  let skipped = 0

  for (const subscriber of subscribers) {
    try {
      await sendEmail({
        to: subscriber.email,
        subject: `This week on Shipyard HQ`,
        react: (
          <DiscoverDigestEmail
            weekStart={weekStart}
            weekEnd={weekEnd}
            freshLaunches={freshLaunches}
            trending={trending}
            ctaUrl={buildBrowseUrl()}
          />
        ),
      })
      sent += 1
    } catch (error) {
      skipped += 1
      console.error("[email] discover digest send failed", {
        email: subscriber.email,
        error,
      })
    }
  }

  return { sent, skipped }
}
