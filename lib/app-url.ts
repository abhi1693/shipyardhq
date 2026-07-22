export const DEFAULT_APP_BASE_URL = "https://shipyardhq.dev"

const NON_PUBLIC_HOSTNAMES = new Set([
  "0.0.0.0",
  "[::]",
  "::",
  "[0:0:0:0:0:0:0:0]",
  "0:0:0:0:0:0:0:0",
])

function isLocalHostname(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1"
  )
}

export function resolveAppBaseUrl(
  configuredUrl: string | undefined,
  environment = process.env.NODE_ENV,
) {
  const value = configuredUrl?.trim()
  if (!value) return DEFAULT_APP_BASE_URL

  try {
    const url = new URL(value)
    const hostname = url.hostname.toLowerCase()
    const isHttp = url.protocol === "http:" || url.protocol === "https:"

    if (!isHttp || NON_PUBLIC_HOSTNAMES.has(hostname)) {
      return DEFAULT_APP_BASE_URL
    }
    if (
      environment === "production" &&
      (url.protocol !== "https:" || isLocalHostname(hostname))
    ) {
      return DEFAULT_APP_BASE_URL
    }

    return url.origin
  } catch {
    return DEFAULT_APP_BASE_URL
  }
}

export function getAppBaseUrl() {
  return resolveAppBaseUrl(process.env.NEXT_PUBLIC_APP_URL)
}
