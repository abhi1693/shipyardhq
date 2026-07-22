import { NextResponse } from "next/server"
import { z } from "zod"

import {
  fetchPublicHtml,
  fetchPublicResource,
  normalizePublicUrl,
} from "@/lib/server/public-html"
import { consumeToolsRequest } from "@/lib/server/tools-rate-limit"
import { analyzeSeoHtml } from "@/lib/tools/seo-audit"

const BodySchema = z.object({
  urls: z.array(z.string().trim().min(1).max(2048)).min(1).max(10),
  includeSiteFiles: z.boolean().optional().default(false),
})

async function inspectSiteFiles(finalUrl: string) {
  const origin = new URL(finalUrl).origin
  const [robots, sitemap] = await Promise.allSettled([
    fetchPublicResource(`${origin}/robots.txt`, "text/plain,*/*"),
    fetchPublicResource(
      `${origin}/sitemap.xml`,
      "application/xml,text/xml,*/*",
    ),
  ])
  const robotsValue = robots.status === "fulfilled" ? robots.value : null
  const sitemapValue = sitemap.status === "fulfilled" ? sitemap.value : null
  return {
    robotsTxt: {
      found: Boolean(
        robotsValue && robotsValue.status >= 200 && robotsValue.status < 300,
      ),
      mentionsSitemap: /(?:^|\n)\s*sitemap\s*:/i.test(robotsValue?.body ?? ""),
    },
    sitemap: {
      found: Boolean(
        sitemapValue &&
        sitemapValue.status >= 200 &&
        sitemapValue.status < 300 &&
        /<(?:urlset|sitemapindex)\b/i.test(sitemapValue.body),
      ),
    },
  }
}

export async function POST(request: Request) {
  const rate = consumeToolsRequest(request)
  if (!rate.allowed)
    return NextResponse.json(
      { error: "Too many scans. Please wait a minute and try again." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
    )
  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success)
    return NextResponse.json(
      { error: "Provide between one and ten valid URLs." },
      { status: 400 },
    )
  let unique: string[]
  try {
    unique = [
      ...new Set(
        parsed.data.urls.map((url) => normalizePublicUrl(url).toString()),
      ),
    ]
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Enter a public URL.",
      },
      { status: 400 },
    )
  }
  const settled = await Promise.allSettled(
    unique.map(async (url) => {
      const page = await fetchPublicHtml(url)
      const siteFiles =
        parsed.data.includeSiteFiles && unique.length === 1
          ? await inspectSiteFiles(page.finalUrl)
          : {}
      return analyzeSeoHtml({ ...page, html: page.body, ...siteFiles })
    }),
  )
  const results = settled.map((result, index) =>
    result.status === "fulfilled"
      ? { url: unique[index], audit: result.value }
      : {
          url: unique[index],
          error:
            result.reason instanceof Error
              ? result.reason.message
              : "The page could not be scanned.",
        },
  )
  return NextResponse.json(
    { results },
    { headers: { "Cache-Control": "no-store" } },
  )
}
