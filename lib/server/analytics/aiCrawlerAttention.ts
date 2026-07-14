import type { SiteAnalyticsSnapshot } from "@/lib/server/analytics/providerTypes"

export const AI_VERIFIED_BOT_CATEGORIES = [
  "AI Crawler",
  "AI Search",
  "AI Assistant",
] as const

const AI_CATEGORY_SET = new Set<string>(AI_VERIFIED_BOT_CATEGORIES)

export function isAiVerifiedBotCategory(value: string) {
  return AI_CATEGORY_SET.has(value.trim())
}

export function normalizeManagedLabels(value?: string[] | null) {
  return Array.from(
    new Set((value ?? []).map((label) => label.trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b))
}

function responseGroup(status: number) {
  if (status >= 200 && status < 300) {
    return { key: "successful", label: "Successful (2xx)" }
  }
  if (status >= 300 && status < 400) {
    return { key: "redirected", label: "Redirected (3xx)" }
  }
  if (status >= 400 && status < 500) {
    return { key: "unavailable", label: "Unavailable (4xx)" }
  }
  if (status >= 500 && status < 600) {
    return { key: "failed", label: "Server errors (5xx)" }
  }
  return { key: "other", label: "Other responses" }
}

function share(requests: number, total: number) {
  return total > 0 ? (requests / total) * 100 : 0
}

export function buildAiCrawlerAttention(args: {
  totalSiteRequests: number
  categories: Array<{ category: string; requests: number }>
  statuses: Array<{
    category: string
    crawlStatus: string
    responseStatus: number
    requests: number
  }>
  endpoints: Array<{
    category: string
    endpoint: string
    matchedEndpoint: string
    managedLabels: string[]
    requests: number
  }>
}): SiteAnalyticsSnapshot["aiCrawlerAttention"] {
  const categoryMap = new Map<string, number>()
  for (const row of args.categories) {
    if (!isAiVerifiedBotCategory(row.category)) continue
    categoryMap.set(
      row.category,
      (categoryMap.get(row.category) ?? 0) + Math.max(0, row.requests),
    )
  }

  const totalRequests = Array.from(categoryMap.values()).reduce(
    (sum, requests) => sum + requests,
    0,
  )
  const categories = Array.from(categoryMap, ([category, requests]) => ({
    category,
    requests,
    share: share(requests, totalRequests),
  })).sort((a, b) => b.requests - a.requests)

  const statusMap = new Map<string, number>()
  const responseMap = new Map<string, { label: string; requests: number }>()
  let successfulRequests = 0
  let statusTotal = 0
  for (const row of args.statuses) {
    if (!isAiVerifiedBotCategory(row.category)) continue
    const requests = Math.max(0, row.requests)
    const crawlStatus = row.crawlStatus.trim() || "unknown"
    statusMap.set(crawlStatus, (statusMap.get(crawlStatus) ?? 0) + requests)

    const group = responseGroup(row.responseStatus)
    const current = responseMap.get(group.key) ?? {
      label: group.label,
      requests: 0,
    }
    current.requests += requests
    responseMap.set(group.key, current)
    statusTotal += requests
    if (row.responseStatus >= 200 && row.responseStatus < 300) {
      successfulRequests += requests
    }
  }

  const endpointMap = new Map<
    string,
    {
      requests: number
      matchedEndpoints: Set<string>
      managedLabels: Set<string>
    }
  >()
  for (const row of args.endpoints) {
    if (!isAiVerifiedBotCategory(row.category)) continue
    const endpoint = row.endpoint.trim() || "/"
    const current = endpointMap.get(endpoint) ?? {
      requests: 0,
      matchedEndpoints: new Set<string>(),
      managedLabels: new Set<string>(),
    }
    current.requests += Math.max(0, row.requests)
    if (row.matchedEndpoint.trim()) {
      current.matchedEndpoints.add(row.matchedEndpoint.trim())
    }
    for (const label of normalizeManagedLabels(row.managedLabels)) {
      current.managedLabels.add(label)
    }
    endpointMap.set(endpoint, current)
  }

  return {
    totalRequests,
    shareOfTraffic: share(totalRequests, args.totalSiteRequests),
    successfulRequests,
    successRate: share(successfulRequests, statusTotal),
    categories,
    crawlStatuses: Array.from(statusMap, ([status, requests]) => ({
      status,
      requests,
      share: share(requests, statusTotal),
    })).sort((a, b) => b.requests - a.requests),
    responseStatuses: Array.from(responseMap, ([key, value]) => ({
      key,
      label: value.label,
      requests: value.requests,
      share: share(value.requests, statusTotal),
    })).sort((a, b) => b.requests - a.requests),
    endpoints: Array.from(endpointMap, ([endpoint, value]) => ({
      endpoint,
      requests: value.requests,
      share: share(value.requests, totalRequests),
      matchedEndpoints: Array.from(value.matchedEndpoints).sort((a, b) =>
        a.localeCompare(b),
      ),
      managedLabels: Array.from(value.managedLabels).sort((a, b) =>
        a.localeCompare(b),
      ),
    })).sort((a, b) => b.requests - a.requests),
  }
}
