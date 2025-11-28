import type { ReactNode } from "react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"

type AnalyticsMetricCardProps = {
  label: string
  value: string
  delta?: number | null
  icon?: ReactNode
}

export function AnalyticsMetricCard({
  label,
  value,
  delta,
  icon,
}: AnalyticsMetricCardProps) {
  const trendLabel =
    delta != null ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%` : null
  const isPositive = delta != null ? delta >= 0 : null
  const trendColor =
    isPositive != null
      ? isPositive
        ? "text-emerald-700"
        : "text-rose-700"
      : "text-slate-600"
  const trendBg =
    isPositive != null
      ? isPositive
        ? "bg-emerald-50"
        : "bg-rose-50"
      : "bg-slate-50"

  return (
    <Card className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <CardHeader className="p-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold text-slate-600">
              {label}
            </CardTitle>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {value}
            </div>
            {trendLabel ? (
              <div
                className={`mt-2 inline-flex items-center gap-2 rounded-md px-2.5 py-1 ${trendBg}`}
              >
                <span className={`text-xs font-semibold ${trendColor}`}>
                  {trendLabel}
                </span>
              </div>
            ) : null}
          </div>
          {icon ? (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-800">
              {icon}
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="p-0" />
    </Card>
  )
}
