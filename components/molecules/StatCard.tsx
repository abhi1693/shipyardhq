"use client"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  CardAction,
} from "@/components/atoms/card"
import { Badge } from "@/components/atoms/badge"
import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react"
import { ReactNode, useMemo, useId } from "react"
import { ResponsiveContainer, AreaChart, Area } from "recharts"

export function StatCard({
  title,
  value,
  badge,
  badgeVariant = "outline",
  subheading,
  footnote,
  trend,
  icon,
  tooltip,
  progress,
  sparkline,
}: {
  title: string
  value: number | string
  badge?: string
  badgeVariant?: "outline" | "default"
  subheading?: string
  footnote?: string
  trend?: "up" | "down"
  icon?: ReactNode
  tooltip?: string
  progress?: number
  sparkline?: number[]
}) {
  const TrendIcon =
    trend === "up" ? IconTrendingUp : trend === "down" ? IconTrendingDown : null

  const formattedValue =
    typeof value === "number"
      ? new Intl.NumberFormat("en", { notation: "compact" }).format(value)
      : value

  const sparkData = useMemo(() => {
    if (!sparkline || sparkline.length < 2) return null
    return sparkline.map((point, index) => ({ index, value: point }))
  }, [sparkline])

  const gradientId = useId().replace(/:/g, "-")

  return (
    <Card
      className="h-full flex flex-col justify-between hover:border-primary/40 transition-colors"
      title={tooltip}
    >
      <CardHeader className="flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground border">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <CardDescription className="truncate">{title}</CardDescription>
            <CardTitle className="text-3xl font-bold tabular-nums @[250px]/card:text-4xl">
              {formattedValue}
            </CardTitle>
          </div>
        </div>
        {badge && (
          <CardAction>
            <Badge
              variant={badgeVariant}
              className="flex items-center gap-1 text-sm"
            >
              {TrendIcon && <TrendIcon className="size-4" />}
              {badge}
            </Badge>
          </CardAction>
        )}
      </CardHeader>

      {sparkData && (
        <div className="px-6 -mt-2">
          <div className="h-12 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData} margin={{ top: 4, bottom: 0, left: 0, right: 0 }}>
                <defs>
                  <linearGradient id={`${gradientId}-fill`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand-2)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--brand-1)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--brand-2)"
                  strokeWidth={2}
                  fill={`url(#${gradientId}-fill)`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {(subheading || footnote || typeof progress === "number") && (
        <CardFooter className="flex-col items-start gap-2 text-sm">
          {subheading && (
            <div className="flex items-center gap-2 font-medium">
              {subheading}
              {TrendIcon && <TrendIcon className="size-4" />}
            </div>
          )}
          {typeof progress === "number" && (
            <div className="w-full">
              <div className="h-1.5 w-full rounded bg-muted overflow-hidden">
                <div
                  className="h-full rounded bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))]"
                  style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                />
              </div>
            </div>
          )}
          {footnote && <div className="text-muted-foreground">{footnote}</div>}
        </CardFooter>
      )}
    </Card>
  )
}
