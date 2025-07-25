import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"

export function OverviewCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Card>
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
