"use client"

import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/atoms/card"
import { Badge } from "@/components/atoms/badge"
import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react"
import { ReactNode, useMemo, useId } from "react"
import { ResponsiveContainer, AreaChart, Area } from "recharts"
import { cn } from "@/lib/utils"

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
      className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-[color:var(--brand-1)/0.2] bg-background/92 shadow-[0px_18px_55px_-40px_rgba(7,58,104,0.45)] backdrop-blur transition-colors hover:border-[color:var(--brand-1)/0.35]"
      title={tooltip}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(7, 58, 104, 0.14) 0%, rgba(7, 58, 104, 0.04) 65%)",
        }}
      />

      <CardHeader className="gap-4 p-6 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {icon && (
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[color:var(--brand-1)/0.25] bg-[color:var(--brand-1)/0.12] text-[color:var(--brand-1)]">
                {icon}
              </span>
            )}
            <div className="min-w-0 space-y-1">
              <p className="text-xs uppercase tracking-[0.32em] text-muted-foreground">
                {title}
              </p>
              <p className="text-4xl font-semibold leading-tight text-foreground tabular-nums">
                {formattedValue}
              </p>
            </div>
          </div>
          {badge && (
            <Badge
              variant={badgeVariant}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border-[color:var(--brand-2)/0.3] bg-[color:var(--brand-2)/0.15] px-2.5 py-1 text-xs font-semibold text-[color:var(--brand-2)]",
                badgeVariant === "outline" &&
                  "border-[color:var(--brand-1)/0.25] bg-background/70 text-[color:var(--brand-1)]",
              )}
            >
              {TrendIcon && <TrendIcon className="h-3.5 w-3.5" />}
              {badge}
            </Badge>
          )}
        </div>

        {subheading && (
          <p className="text-sm text-muted-foreground">{subheading}</p>
        )}
      </CardHeader>

      {sparkData ? (
        <CardContent className="px-6">
          <div className="h-14 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={sparkData}
                margin={{ top: 6, bottom: 0, left: 0, right: 0 }}
              >
                <defs>
                  <linearGradient
                    id={`${gradientId}-fill`}
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="var(--brand-2)"
                      stopOpacity={0.5}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--brand-1)"
                      stopOpacity={0.05}
                    />
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
        </CardContent>
      ) : null}

      {(footnote || typeof progress === "number") && (
        <CardFooter className="flex flex-col gap-2 px-6 pb-6 pt-0 text-sm">
          {typeof progress === "number" && (
            <div className="w-full">
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{Math.round(Math.max(0, Math.min(100, progress)))}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--brand-1)/0.1]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))]"
                  style={{
                    width: `${Math.max(0, Math.min(100, progress))}%`,
                  }}
                />
              </div>
            </div>
          )}
          {footnote && (
            <span className="text-xs text-muted-foreground">{footnote}</span>
          )}
        </CardFooter>
      )}
    </Card>
  )
}
