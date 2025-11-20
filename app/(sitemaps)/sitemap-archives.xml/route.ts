import { getMonthlyLeaderboardMonths } from "@/actions/public/leaderboard/actions"
import {
  LEADERBOARD_MONTHLY_PATH,
  monthlyLeaderboardArchivePath,
} from "@/lib/routes"
import { resolveSiteUrl } from "@/lib/siteConfig"

export const dynamic = "force-static"
export const revalidate = 86400

function xml(parts: TemplateStringsArray, ...subs: any[]) {
  return parts.map((p, i) => p + (subs[i] ?? "")).join("")
}

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

  const urls = [
    xml`
      <url>
        <loc>${base}${LEADERBOARD_MONTHLY_PATH}</loc>
        <lastmod>${now.toISOString()}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.6</priority>
      </url>
    `,
    ...months.map(
      (monthEntry: (typeof months)[number], index: number) => {
      const monthDate = toMonthDate(monthEntry.month, now)
      const recencyPriority = index < 3 ? "0.6" : index < 12 ? "0.5" : "0.4"
      return xml`
        <url>
          <loc>${base}${monthlyLeaderboardArchivePath(monthEntry.month)}</loc>
          <lastmod>${monthDate.toISOString()}</lastmod>
          <changefreq>yearly</changefreq>
          <priority>${recencyPriority}</priority>
        </url>
      `
    }),
  ].join("")

  const body = xml`
    <?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${urls}
    </urlset>
  `.trim()

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  })
}
