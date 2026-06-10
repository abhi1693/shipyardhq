import { getMonthlyLeaderboardMonths } from "@/actions/public/leaderboard/actions"
import {
  LEADERBOARD_MONTHLY_PATH,
  monthlyLeaderboardArchivePath,
} from "@/lib/routes"
import { resolveSiteUrl } from "@/lib/siteConfig"
import { sitemapResponse, urlsetXml } from "@/lib/sitemap"

export const dynamic = "force-dynamic"
export const revalidate = 86400

const toMonthDate = (monthKey: string, fallback: Date) => {
  const match = monthKey.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (!match) {
    return fallback
  }
  const day = Number(match[1])
  const monthIndex = Number(match[2]) - 1
  const year = Number(match[3])
  if (
    !Number.isFinite(day) ||
    !Number.isFinite(monthIndex) ||
    !Number.isFinite(year)
  ) {
    return fallback
  }
  if (monthIndex < 0 || monthIndex > 11) return fallback
  const date = new Date(Date.UTC(year, monthIndex, day))
  if (date.getUTCFullYear() !== year) return fallback
  if (date.getUTCMonth() !== monthIndex) return fallback
  if (date.getUTCDate() !== day) return fallback
  return date
}

export async function GET() {
  const base = resolveSiteUrl()

  const months = await getMonthlyLeaderboardMonths()
  const now = new Date()

  return sitemapResponse(
    urlsetXml([
      {
        loc: `${base}${LEADERBOARD_MONTHLY_PATH}`,
        lastmod: now,
        changefreq: "weekly",
        priority: "0.6",
      },
      ...months.map((monthEntry: (typeof months)[number], index: number) => {
        const monthDate = toMonthDate(monthEntry.month, now)
        const recencyPriority = index < 3 ? "0.6" : index < 12 ? "0.5" : "0.4"
        return {
          loc: `${base}${monthlyLeaderboardArchivePath(monthEntry.month)}`,
          lastmod: monthDate,
          changefreq: "yearly" as const,
          priority: recencyPriority,
        }
      }),
    ]),
  )
}
