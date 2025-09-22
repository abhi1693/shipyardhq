import type { MetadataRoute } from "next"
import { ADMIN_BASE_PATH, MEMBER_BASE_PATH } from "@/lib/routes"

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
        disallow: [MEMBER_BASE_PATH, ADMIN_BASE_PATH, "/api"],
      },
    ],
    sitemap: [`${baseStr}/sitemap.xml`],
    host,
  }
}
