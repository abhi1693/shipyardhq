import type { MetadataRoute } from "next"
import { ADMIN_BASE_PATH, MEMBER_BASE_PATH } from "@/lib/routes"
import { resolveSiteUrl } from "@/lib/siteConfig"

export default function robots(): MetadataRoute.Robots {
  const baseStr = resolveSiteUrl()
  let host: string | undefined
  try {
    const u = new URL(baseStr)
    host = u.host
  } catch {
    host = undefined
  }
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          MEMBER_BASE_PATH,
          ADMIN_BASE_PATH,
          "/api",
          "/r/",
          "/_next/static/",
        ],
      },
    ],
    sitemap: [`${baseStr}/sitemap.xml`],
    host,
  }
}
