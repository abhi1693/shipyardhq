import type {
  AnalyticsValueListItem,
  AnalyticsValueListProps,
} from "@/components/molecules/AnalyticsValueList"
import { AnalyticsValueList } from "@/components/molecules/AnalyticsValueList"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { cn } from "@/lib/utils"

type AnalyticsListCardProps = {
  title: string
  description?: string
  items: AnalyticsValueListItem[]
  max?: number
  tone?: "blue" | "indigo"
  listClassName?: string
  emptyLabel: string
  emptyClassName?: string
  cardClassName?: string
  headerClassName?: string
  contentClassName?: string
  titleClassName?: string
  descriptionClassName?: string
  valueBarRowProps?: AnalyticsValueListProps["valueBarRowProps"]
}

export function AnalyticsListCard({
  title,
  description,
  items,
  max,
  tone,
  listClassName,
  emptyLabel,
  emptyClassName,
  cardClassName,
  headerClassName,
  contentClassName,
  titleClassName,
  descriptionClassName,
  valueBarRowProps,
}: AnalyticsListCardProps) {
  return (
    <Card className={cn("border-slate-200 bg-white shadow-sm", cardClassName)}>
      <CardHeader className={cn("pb-1", headerClassName)}>
        <CardTitle className={cn("text-lg font-semibold", titleClassName)}>
          {title}
        </CardTitle>
        {description ? (
          <CardDescription
            className={cn(
              "text-sm text-muted-foreground",
              descriptionClassName,
            )}
          >
            {description}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className={cn("pt-3", contentClassName)}>
        <AnalyticsValueList
          items={items}
          max={max}
          tone={tone}
          className={listClassName}
          emptyLabel={emptyLabel}
          emptyClassName={emptyClassName}
          valueBarRowProps={valueBarRowProps}
        />
      </CardContent>
    </Card>
  )
}
