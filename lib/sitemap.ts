export const SITEMAP_CHUNK_SIZE = 50000

type SitemapDate = Date | string

type SitemapIndexEntry = {
  loc: string
  lastmod?: SitemapDate | null
}

type SitemapUrlEntry = {
  loc: string
  lastmod?: SitemapDate | null
  changefreq?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never"
  priority?: string | number | null
}

export function escapeXml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
}

export function formatSitemapDate(value?: SitemapDate | null) {
  if (!value) return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString()
  }
  return value
}

export function getSitemapShardCount(total: number) {
  if (!Number.isFinite(total) || total <= 0) return 0
  return Math.ceil(total / SITEMAP_CHUNK_SIZE)
}

export function parseSitemapShardIndex(value: string) {
  const page = Number(value)
  if (!Number.isInteger(page) || page < 1) return null
  return page
}

export function isSitemapShardOutOfRange(page: number, total: number) {
  if (total <= 0) return true
  return (page - 1) * SITEMAP_CHUNK_SIZE >= total
}

export function sitemapResponse(body: string, init?: ResponseInit) {
  const headers = new Headers(init?.headers)
  headers.set("Content-Type", "application/xml; charset=utf-8")

  return new Response(body, {
    ...init,
    headers,
  })
}

export function sitemapIndexXml(entries: SitemapIndexEntry[]) {
  const sitemaps = entries
    .map((entry) => {
      const lastmod = formatSitemapDate(entry.lastmod)
      return [
        "      <sitemap>",
        `        <loc>${escapeXml(entry.loc)}</loc>`,
        lastmod ? `        <lastmod>${escapeXml(lastmod)}</lastmod>` : null,
        "      </sitemap>",
      ]
        .filter(Boolean)
        .join("\n")
    })
    .join("\n")

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    sitemaps,
    "</sitemapindex>",
  ]
    .filter(Boolean)
    .join("\n")
}

export function urlsetXml(entries: SitemapUrlEntry[]) {
  const urls = entries
    .map((entry) => {
      const lastmod = formatSitemapDate(entry.lastmod)
      const priority =
        entry.priority === null || entry.priority === undefined
          ? null
          : String(entry.priority)

      return [
        "      <url>",
        `        <loc>${escapeXml(entry.loc)}</loc>`,
        lastmod ? `        <lastmod>${escapeXml(lastmod)}</lastmod>` : null,
        entry.changefreq
          ? `        <changefreq>${escapeXml(entry.changefreq)}</changefreq>`
          : null,
        priority ? `        <priority>${escapeXml(priority)}</priority>` : null,
        "      </url>",
      ]
        .filter(Boolean)
        .join("\n")
    })
    .join("\n")

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    "</urlset>",
  ]
    .filter(Boolean)
    .join("\n")
}
