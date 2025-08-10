// Simple in-memory rate limiter keyed by arbitrary string
// Use for best-effort de-duplication in a single server instance

const buckets: Map<string, number> = new Map()
let opCount = 0

function prune(expireBefore: number) {
  for (const [k, ts] of buckets) {
    if (ts < expireBefore) buckets.delete(k)
  }
}

export function allowOncePerWindow(key: string, windowMs: number): boolean {
  const now = Date.now()
  const last = buckets.get(key)
  if (last && now - last < windowMs) {
    return false
  }
  buckets.set(key, now)
  // Periodically prune old entries to avoid unbounded growth
  if (++opCount % 1000 === 0) prune(now - windowMs * 10)
  return true
}

