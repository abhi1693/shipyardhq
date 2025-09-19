import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { cn } from "@/lib/utils"

export function OverviewCard({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="divide-y text-sm">{children}</CardContent>
    </Card>
  )
}

export function OverviewRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-3 items-start gap-4 py-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2 break-words">{value}</dd>
    </div>
  )
}
