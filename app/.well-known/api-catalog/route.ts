import { resolveSiteUrl, siteConfig } from "@/lib/siteConfig"

export const dynamic = "force-static"
export const revalidate = 86400

const API_CATALOG_PROFILE = "https://www.rfc-editor.org/info/rfc9727"

const contentType = `application/linkset+json; profile="${API_CATALOG_PROFILE}"; charset=utf-8`

const buildUrl = (path: string) => new URL(path, resolveSiteUrl()).toString()

export function GET() {
  const catalogUrl = buildUrl("/.well-known/api-catalog")

  return Response.json(
    {
      linkset: [
        {
          anchor: catalogUrl,
          item: [
            {
              href: buildUrl("/api/analytics/realtime"),
              title: "Realtime public traffic summary",
              type: "application/json",
            },
          ],
          "service-doc": [
            {
              href: buildUrl("/llms.txt"),
              title: `${siteConfig.name} agent retrieval guide`,
              type: "text/plain",
            },
          ],
          describedby: [
            {
              href: buildUrl("/sitemap.xml"),
              title: `${siteConfig.name} sitemap index`,
              type: "application/xml",
            },
          ],
        },
      ],
    },
    {
      headers: {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "Content-Type": contentType,
        Link: [
          '</llms.txt>; rel="service-doc"; type="text/plain"',
          '</sitemap.xml>; rel="describedby"; type="application/xml"',
        ].join(", "),
      },
    },
  )
}
