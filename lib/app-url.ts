const DEFAULT_APP_BASE_URL = "https://shipyardhq.dev"

export function getAppBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL
  if (envUrl && envUrl.length) return envUrl.replace(/\/$/, "")
  return DEFAULT_APP_BASE_URL
}
