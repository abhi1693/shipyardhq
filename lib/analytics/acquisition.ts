export const ACQUISITION_COOKIE = "shipyard_acquisition"
export type AcquisitionTouch = {
  path?: string
  source?: string
  medium?: string
  referrerHost?: string
  observedAt: number
}
export type AcquisitionContext = {
  version: 1
  firstTouch: AcquisitionTouch
  conversionVisit?: AcquisitionTouch
  clientId?: string
  sessionId?: string
  idsObservedAt?: number
}

const PUBLIC_ROOTS = new Set([
  "products",
  "categories",
  "use-cases",
  "alternatives",
  "guides",
  "tools",
  "tags",
  "platforms",
  "pricing-models",
  "product-types",
  "leaderboard",
])
const STATIC_PATHS = new Set([
  "/",
  "/pricing",
  "/why-shipyard",
  "/about",
  "/editorial-policy",
  "/browse",
  "/analytics",
])

export function acquisitionPath(value: unknown): string | undefined {
  if (
    typeof value !== "string" ||
    value.length > 200 ||
    /[?@%\\\s]/.test(value)
  )
    return undefined
  if (STATIC_PATHS.has(value)) return value
  const parts = value.split("/").filter(Boolean)
  if (
    !PUBLIC_ROOTS.has(parts[0]) ||
    parts.length > 5 ||
    !parts.every((part) => /^[a-z0-9-]{1,80}$/i.test(part))
  )
    return undefined
  return `/${parts.join("/")}`
}

function campaignLabel(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim().toLowerCase()
  if (
    !/^[a-z][a-z0-9._-]{0,39}$/.test(trimmed) ||
    /(?:token|secret|password|^sk[-_]|^ghp_|^eyj)|\d{7}/i.test(trimmed)
  )
    return undefined
  return trimmed
}

function normalizeTouch(value: unknown): AcquisitionTouch | undefined {
  if (!value || typeof value !== "object") return undefined
  const input = value as Record<string, unknown>
  if (
    typeof input.observedAt !== "number" ||
    !Number.isFinite(input.observedAt) ||
    input.observedAt <= 0
  )
    return undefined
  const path = acquisitionPath(input.path)
  const source = campaignLabel(input.source)
  const medium = campaignLabel(input.medium)
  const referrerHost =
    typeof input.referrerHost === "string" &&
    /^[a-z0-9.-]{1,120}$/i.test(input.referrerHost)
      ? input.referrerHost.toLowerCase()
      : undefined
  return {
    observedAt: input.observedAt,
    ...(path ? { path } : {}),
    ...(source ? { source } : {}),
    ...(medium ? { medium } : {}),
    ...(referrerHost ? { referrerHost } : {}),
  }
}

export function normalizeAcquisitionContext(
  value: unknown,
): AcquisitionContext | undefined {
  if (!value || typeof value !== "object") return undefined
  const input = value as Record<string, unknown>
  const firstTouch = normalizeTouch(input.firstTouch)
  if (input.version !== 1 || !firstTouch) return undefined
  const conversionVisit = normalizeTouch(input.conversionVisit)
  const clientId =
    typeof input.clientId === "string" &&
    /^\d{1,20}\.\d{1,20}$/.test(input.clientId)
      ? input.clientId
      : undefined
  const sessionId =
    typeof input.sessionId === "string" && /^\d{1,16}$/.test(input.sessionId)
      ? input.sessionId
      : undefined
  const idsObservedAt =
    typeof input.idsObservedAt === "number" &&
    Number.isFinite(input.idsObservedAt)
      ? input.idsObservedAt
      : undefined
  return {
    version: 1,
    firstTouch,
    ...(conversionVisit ? { conversionVisit } : {}),
    ...(clientId ? { clientId } : {}),
    ...(sessionId ? { sessionId } : {}),
    ...(idsObservedAt ? { idsObservedAt } : {}),
  }
}

export function parseAcquisitionCookie(value?: string) {
  if (!value || value.length > 4000) return undefined
  try {
    return normalizeAcquisitionContext(JSON.parse(decodeURIComponent(value)))
  } catch {
    return undefined
  }
}

export function acquisitionTouchFromLocation(
  pathname: string,
  search: string,
  referrer: string,
  observedAt = Date.now(),
): AcquisitionTouch | undefined {
  const path = acquisitionPath(pathname)
  if (!path) return undefined
  const query = new URLSearchParams(search)
  let referrerHost: string | undefined
  try {
    referrerHost = new URL(referrer).hostname
  } catch {
    /* Unknown referrer stays unknown. */
  }
  return normalizeTouch({
    path,
    source: query.get("utm_source"),
    medium: query.get("utm_medium"),
    referrerHost,
    observedAt,
  })
}

/** Checkout metadata is an explicit allowlist; never forward arbitrary URL,
 * query, user profile, email, token, or auth-provider metadata into analytics.
 */
export function acquisitionCheckoutMetadata(
  context?: AcquisitionContext,
): Record<string, string> {
  const normalized = normalizeAcquisitionContext(context)
  if (!normalized) return {}
  const serialized = JSON.stringify(normalized)
  // Provider metadata values are bounded; split at stable ASCII boundaries.
  return Object.fromEntries(
    Array.from({ length: Math.ceil(serialized.length / 400) }, (_, index) => [
      `shipyard_acq_${index}`,
      serialized.slice(index * 400, (index + 1) * 400),
    ]),
  )
}

export function acquisitionFromCheckoutMetadata(
  metadata?: Record<string, unknown> | null,
) {
  if (!metadata) return undefined
  let value = ""
  for (let index = 0; index < 8; index++) {
    const part = metadata[`shipyard_acq_${index}`]
    if (typeof part !== "string") break
    value += part
  }
  try {
    return normalizeAcquisitionContext(JSON.parse(value))
  } catch {
    return undefined
  }
}

export function acquisitionEventParams(
  context: AcquisitionContext,
  now = Date.now(),
) {
  const freshSession =
    context.sessionId &&
    context.idsObservedAt &&
    now >= context.idsObservedAt &&
    now - context.idsObservedAt <= 24 * 60 * 60 * 1000
  return {
    ...(freshSession &&
    Number.isSafeInteger(Number(context.sessionId)) &&
    Number(context.sessionId) > 0
      ? { session_id: Number(context.sessionId) }
      : {}),
    ...(context.firstTouch.path
      ? { first_landing_path: context.firstTouch.path }
      : {}),
    ...(context.firstTouch.source
      ? { first_source: context.firstTouch.source }
      : {}),
    ...(context.firstTouch.medium
      ? { first_medium: context.firstTouch.medium }
      : {}),
    ...(context.firstTouch.referrerHost
      ? { first_referrer_host: context.firstTouch.referrerHost }
      : {}),
    ...(context.conversionVisit?.path
      ? { conversion_landing_path: context.conversionVisit.path }
      : {}),
    ...(context.conversionVisit?.source
      ? { conversion_source: context.conversionVisit.source }
      : {}),
    ...(context.conversionVisit?.medium
      ? { conversion_medium: context.conversionVisit.medium }
      : {}),
  }
}
