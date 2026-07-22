import "server-only"

const WINDOW_MS = 60_000
const LIMIT = 20
const buckets = new Map<string, { count: number; resetAt: number }>()

export function consumeToolsRequest(request: Request) {
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim()
  const key = forwarded || request.headers.get("x-real-ip") || "unknown"
  const now = Date.now()
  const current = buckets.get(key)
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, retryAfter: 0 }
  }
  current.count += 1
  if (buckets.size > 5000)
    for (const [bucketKey, bucket] of buckets)
      if (bucket.resetAt <= now) buckets.delete(bucketKey)
  return {
    allowed: current.count <= LIMIT,
    retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  }
}
