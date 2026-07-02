import { getMonthlyLeaderboardMonths } from "@/actions/public/leaderboard/actions"
import {
  currentMonthlyLeaderboardPath,
  monthlyLeaderboardArchivePath,
} from "@/lib/routes"
import { resolveSiteUrl } from "@/lib/siteConfig"
import { sitemapResponse, urlsetXml, type SitemapUrlEntry } from "@/lib/sitemap"

const toMonthDate = (monthKey: string) => {
  const match = monthKey.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (!match) {
    return null
  }
  const day = Number(match[1])
  const monthIndex = Number(match[2]) - 1
  const year = Number(match[3])
  if (
    !Number.isFinite(day) ||
    !Number.isFinite(monthIndex) ||
    !Number.isFinite(year)
  ) {
    return null
  }
  if (monthIndex < 0 || monthIndex > 11) return null
  const date = new Date(Date.UTC(year, monthIndex, day))
  if (date.getUTCFullYear() !== year) return null
  if (date.getUTCMonth() !== monthIndex) return null
  if (date.getUTCDate() !== day) return null
  return date
}

export async function GET() {
  const base = resolveSiteUrl()

  const months = await getMonthlyLeaderboardMonths()
  const now = new Date()
  const currentMonthlyPath = currentMonthlyLeaderboardPath(now)
  const currentMonthlyLoc = `${base}${currentMonthlyPath}`
  const currentEntry: SitemapUrlEntry = {
    loc: currentMonthlyLoc,
    changefreq: "weekly",
    priority: "0.6",
  }
  const archiveEntries: SitemapUrlEntry[] = months
    .map(
      (monthEntry: (typeof months)[number], index: number): SitemapUrlEntry => {
        const monthDate = toMonthDate(monthEntry.month)
        const recencyPriority = index < 3 ? "0.6" : index < 12 ? "0.5" : "0.4"

        return {
          loc: `${base}${monthlyLeaderboardArchivePath(monthEntry.month)}`,
          lastmod: monthDate,
          changefreq: "yearly",
          priority: recencyPriority,
        }
      },
    )
    .filter((entry) => entry.loc !== currentMonthlyLoc)
  const entries: SitemapUrlEntry[] = [currentEntry, ...archiveEntries]

  return sitemapResponse(urlsetXml(entries))
}
