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
import { ReactNode } from "react"

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

  // Prepare sparkline path (normalized to a 100x24 viewBox)
  const pathD = (() => {
    if (!sparkline || sparkline.length < 2) return undefined
    const values = sparkline
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1
    const w = 100
    const h = 24
    const stepX = w / (values.length - 1)
    const points = values.map((v, i) => {
      const x = i * stepX
      const y = h - ((v - min) / range) * h
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    return `M ${points[0]} L ${points.slice(1).join(" ")}`
  })()

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

      {pathD && (
        <div className="px-6 -mt-2">
          <svg
            viewBox="0 0 100 24"
            width="100%"
            height="24"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="text-primary/60"
          >
            <path d={pathD} fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
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
