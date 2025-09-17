import { EMAIL_BRAND } from "@/lib/email/brand"

export function getAppBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL
  if (envUrl && envUrl.length) return envUrl.replace(/\/$/, "")
  return EMAIL_BRAND.homeUrl.replace(/\/$/, "")
}
