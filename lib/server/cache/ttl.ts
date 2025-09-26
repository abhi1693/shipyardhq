export type CacheTier = "fastest" | "fast" | "default" | "slow" | "slowest"

const CACHE_TTL_DEFAULTS: Record<CacheTier, number> = {
  fastest: 30,
  fast: 60,
  default: 120,
  slow: 300,
  slowest: 3600,
} as const

export function resolveCacheTtl(
  tier: CacheTier,
  override?: number | null,
): number {
  if (typeof override === "number" && Number.isFinite(override) && override > 0) {
    return override
  }

  return CACHE_TTL_DEFAULTS[tier] ?? CACHE_TTL_DEFAULTS.default
}

export { CACHE_TTL_DEFAULTS }
