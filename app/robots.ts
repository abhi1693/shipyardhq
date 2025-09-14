import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  const baseStr = (
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ).replace(/\/$/, "")
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
        disallow: ["/member", "/admin", "/api"],
      },
    ],
    sitemap: [`${baseStr}/sitemap.xml`],
    host,
  }
}
