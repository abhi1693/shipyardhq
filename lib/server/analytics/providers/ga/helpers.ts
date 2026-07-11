import { protos } from "@google-analytics/data"

import {
  normalizeGaHostname,
  resolveExcludedGaHostnames,
} from "@/lib/analytics/gaHostnames"

type FilterExpression = protos.google.analytics.data.v1beta.IFilterExpression

export { normalizeGaHostname, resolveExcludedGaHostnames }

export function parseDateString(
  value: string | null | undefined,
): string | null {
  if (!value || value.length !== 8) return null
  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(4, 6))
  const day = Number(value.slice(6, 8))
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return null
  }
  return new Date(Date.UTC(year, month - 1, day)).toISOString()
}

export function normalizeBounceRate(raw: number) {
  if (!Number.isFinite(raw)) return 0
  return raw > 0 && raw <= 1 ? raw * 100 : raw
}

export function normalizePath(value: string | undefined | null) {
  if (!value) return "/"
  const base = value.split(/[?#]/)[0] || "/"
  if (base !== "/" && base.endsWith("/")) {
    return base.slice(0, -1)
  }
  return base
}

export function resolveReferrerDomain(value?: string | null) {
  const raw = value?.trim()
  if (!raw || raw === "(direct)") return "direct"

  const cleaned = raw
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .trim()
    .toLowerCase()

  const domain = cleaned.split(/[/#?]/)[0]
  if (domain) return domain

  return "direct"
}

export function extractProductSlug(path: string | null | undefined) {
  if (!path) return null
  const normalized = normalizePath(path)
  const match = normalized.match(/^\/products\/([^/]+)/)
  return match ? match[1]!.toLowerCase() : null
}

export function buildPagePathFilter(pagePaths: string[]): FilterExpression {
  if (pagePaths.length === 0) {
    throw new Error("No page paths provided for GA product traffic")
  }

  if (pagePaths.length === 1) {
    return {
      filter: {
        fieldName: "pagePath",
        stringFilter: {
          matchType:
            protos.google.analytics.data.v1beta.Filter.StringFilter.MatchType
              .EXACT,
          value: pagePaths[0],
        },
      },
    }
  }

  return {
    orGroup: {
      expressions: pagePaths.map((path) => ({
        filter: {
          fieldName: "pagePath",
          stringFilter: {
            matchType:
              protos.google.analytics.data.v1beta.Filter.StringFilter.MatchType
                .EXACT,
            value: path,
          },
        },
      })),
    },
  }
}

export function buildGaHostnameExclusionFilter(
  hostnames = resolveExcludedGaHostnames(),
): FilterExpression | null {
  const values = Array.from(
    new Set(
      hostnames
        .map((hostname) => normalizeGaHostname(hostname))
        .filter((hostname): hostname is string => Boolean(hostname)),
    ),
  )

  if (values.length === 0) return null

  return {
    notExpression: {
      filter: {
        fieldName: "hostName",
        inListFilter: {
          values,
          caseSensitive: false,
        },
      },
    },
  }
}

export function andGaDimensionFilters(
  first: FilterExpression | null | undefined,
  second: FilterExpression | null | undefined,
): FilterExpression | undefined {
  if (!first && !second) return undefined
  if (!first) return second ?? undefined
  if (!second) return first

  return {
    andGroup: {
      expressions: [first, second],
    },
  }
}

export function parseMetricValue(value?: string | null) {
  const numeric = Number(value ?? 0)
  return Number.isFinite(numeric) ? numeric : 0
}

export function resolveMetricValue(
  totals: protos.google.analytics.data.v1beta.IMetricValue[] | undefined,
  index: number,
  rows:
    protos.google.analytics.data.v1beta.IRow[] | null | undefined = undefined,
  mode: "sum" | "avg" = "sum",
) {
  const totalEntry = totals?.[index]
  const totalValue =
    totalEntry && "value" in totalEntry
      ? parseMetricValue(totalEntry.value)
      : null

  if (totalValue !== null) {
    return totalValue
  }

  if (!rows?.length) return 0

  if (mode === "avg") {
    const values = rows.map((row) =>
      parseMetricValue(row.metricValues?.[index]?.value),
    )
    const sum = values.reduce((acc, val) => acc + val, 0)
    return values.length ? sum / values.length : 0
  }

  return rows.reduce(
    (acc, row) => acc + parseMetricValue(row.metricValues?.[index]?.value),
    0,
  )
}
