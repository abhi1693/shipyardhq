export type AuthRedirectSearchParams = {
  redirect_url?: string | string[]
  redirectUrl?: string | string[]
}

const allowedRedirectProtocols = new Set(["http:", "https:"])

const coerceToString = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value

const getConfiguredHost = () => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) return null

  try {
    return new URL(appUrl).host.toLowerCase()
  } catch {
    return null
  }
}

export const sanitizeRedirectUrl = (
  rawUrl: string | undefined,
  requestHost: string | null,
) => {
  if (!rawUrl) return undefined

  const trimmedUrl = rawUrl.trim()
  if (!trimmedUrl) return undefined

  if (trimmedUrl.startsWith("/")) {
    return trimmedUrl
  }

  try {
    const parsed = new URL(trimmedUrl)

    if (!allowedRedirectProtocols.has(parsed.protocol)) {
      return undefined
    }

    const allowedHosts = new Set<string>()
    if (requestHost) allowedHosts.add(requestHost.toLowerCase())
    const configuredHost = getConfiguredHost()
    if (configuredHost) allowedHosts.add(configuredHost)

    if (allowedHosts.size > 0 && !allowedHosts.has(parsed.host.toLowerCase())) {
      return undefined
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return undefined
  }
}

export const resolveRedirectUrl = (
  searchParams: AuthRedirectSearchParams | undefined,
  requestHost: string | null,
) => {
  if (!searchParams) return undefined

  const redirectParam =
    coerceToString(searchParams.redirect_url) ??
    coerceToString(searchParams.redirectUrl)

  return sanitizeRedirectUrl(redirectParam, requestHost)
}
