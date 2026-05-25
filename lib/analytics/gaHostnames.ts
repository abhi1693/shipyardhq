export const DEFAULT_EXCLUDED_GA_HOSTNAMES = ["localhost", "127.0.0.1", "::1"]

export function normalizeGaHostname(value: string): string | null {
  const raw = value.trim().toLowerCase()
  if (!raw) return null

  if (raw === "::1") return raw

  try {
    const url = new URL(
      /^[a-z][a-z0-9+.-]*:\/\//.test(raw) ? raw : `http://${raw}`,
    )
    return url.hostname.replace(/^\[|\]$/g, "") || null
  } catch {
    const withoutScheme = raw.replace(/^[a-z][a-z0-9+.-]*:\/\//, "")
    const hostWithPort = withoutScheme.split(/[/?#]/)[0]?.trim() ?? ""
    if (!hostWithPort) return null
    if (hostWithPort.startsWith("[")) {
      const end = hostWithPort.indexOf("]")
      return end > 1 ? hostWithPort.slice(1, end) : null
    }
    return hostWithPort.replace(/:\d+$/, "") || null
  }
}

export function resolveExcludedGaHostnames(
  raw = process.env.GA_EXCLUDED_HOSTNAMES,
): string[] {
  const configured = raw
    ?.split(",")
    .map((value) => normalizeGaHostname(value))
    .filter((value): value is string => Boolean(value))

  return Array.from(
    new Set([...DEFAULT_EXCLUDED_GA_HOSTNAMES, ...(configured ?? [])]),
  )
}
