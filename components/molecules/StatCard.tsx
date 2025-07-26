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

export function StatCard({
  title,
  value,
  badge,
  badgeVariant = "outline",
  subheading,
  footnote,
  trend,
}: {
  title: string
  value: number | string
  badge?: string
  badgeVariant?: "outline" | "default"
  subheading?: string
  footnote?: string
  trend?: "up" | "down"
}) {
  const TrendIcon =
    trend === "up" ? IconTrendingUp : trend === "down" ? IconTrendingDown : null

  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl font-bold tabular-nums @[250px]/card:text-4xl">
          {value}
        </CardTitle>
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

      {(subheading || footnote) && (
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          {subheading && (
            <div className="flex items-center gap-2 font-medium">
              {subheading}
              {trend === "up" && <IconTrendingUp className="size-4" />}
              {trend === "down" && <IconTrendingDown className="size-4" />}
            </div>
          )}
          {footnote && <div className="text-muted-foreground">{footnote}</div>}
        </CardFooter>
      )}
    </Card>
  )
}
