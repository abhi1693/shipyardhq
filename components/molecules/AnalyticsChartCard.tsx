import type { ReactNode } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/atoms/tooltip"
import { Info } from "lucide-react"

import { cn } from "@/lib/utils"

const infoTriggerClass =
  "inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-slate-200/70 focus:ring-offset-2 cursor-help"

interface AnalyticsChartCardProps {
  title: string
  description?: ReactNode
  tooltip?: ReactNode
  infoLabel?: string
  className?: string
  headerClassName?: string
  contentClassName?: string
  children: ReactNode
}

export function AnalyticsChartCard({
  title,
  description,
  tooltip,
  infoLabel,
  className,
  headerClassName,
  contentClassName,
  children,
}: AnalyticsChartCardProps) {
  return (
    <Card
      className={cn("border border-slate-200 bg-white/95 shadow-sm", className)}
    >
      <CardHeader className={headerClassName}>
        <CardTitle className="flex items-center gap-2">
          {title}
          {tooltip ? (
            <Tooltip>
              <TooltipTrigger
                className={infoTriggerClass}
                aria-label={infoLabel ?? `Learn more about ${title}`}
              >
                <Info className="h-4 w-4" aria-hidden />
              </TooltipTrigger>
              <TooltipContent sideOffset={6}>{tooltip}</TooltipContent>
            </Tooltip>
          ) : null}
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  )
}
